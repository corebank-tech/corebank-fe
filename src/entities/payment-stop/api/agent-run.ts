import * as React from "react"
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import {
  getGetObjectionReviewDraftQueryKey,
  getListObjectionAgentRunStepsQueryKey,
  getListObjectionAgentRunsQueryKey,
  getObjectionReviewDraft,
  listObjectionAgentRunSteps,
  requestObjectionReview,
  useListObjectionAgentRuns,
  type AgentRunResponse,
  type AgentRunStepResponse,
  type ReviewDraftResponse,
} from "@/shared/api/generated"
import { withIdempotencyKey } from "@/shared/api/custom-fetch"

/**
 * 이의제기 AI 분석(계획 PA-05) 조회와 재분석 요청.
 *
 * 실시간 표시는 1초 폴링이다(D20). 실행 목록과 단계 모두 실행이 끝나면 폴링을 멈춘다.
 * 단계는 `after` 에 마지막으로 받은 순번을 넘겨 새 단계만 받고, 받은 것 뒤에 붙인다.
 *
 * 폴링 요청은 유휴 타이머의 활동으로 세지 않는다(`background`). 세면 화면을 열어 둔 것만으로
 * 관리자 30분 자동 로그아웃(POL-A01)이 오지 않는다. 실행이 대기(`QUEUED`)에서 1분 넘게
 * 움직이지 않으면 폴링을 멈춘다. 서버 킬스위치 기본값이 꺼짐이고 대기 실행에는 만료가 없어서,
 * 워커가 없는 환경에서는 대기가 끝나지 않는다. 멈춘 뒤에는 담당자가 다시 확인을 눌러 받는다.
 *
 * 판정안과 단계 상세(`detail`, `content`)는 스펙상 자유 형식 JSON 이라 여기서 모양을
 * 확인하며 읽는다. 모르는 값은 버리고, 빠진 값은 빈 목록으로 둔다.
 */

/** 실시간 표시 간격(D20). */
export const AGENT_POLL_INTERVAL_MS = 1000

/** 대기만 이어질 때 폴링을 멈추기까지 기다리는 시간. */
export const QUEUE_STALL_MS = 60_000

const queuedRunKey = (runId: number | undefined) => `run-${runId ?? 0}`

/** 폴링 요청 설정. 유휴 타이머의 활동으로 세지 않는다. */
const POLL_REQUEST = { background: true } as const

/**
 * 대기가 오래 이어지는지 본다. `queuedKey` 는 지금 대기 중인 대상(실행 번호 등)이고, 대기가
 * 아니면 `null` 이다. 같은 대상이 `QUEUE_STALL_MS` 넘게 대기면 멈춘 것으로 본다. `resume` 은
 * 담당자가 다시 확인을 눌렀을 때 시계를 처음부터 다시 잰다.
 *
 * `stalledKeyRef` 는 폴링 간격 함수가 렌더 밖에서 읽는 자리다. 시간이 다 되는 순간 함께 바꿔,
 * 화면이 다시 그려지기 전의 폴링 한 번도 나가지 않게 한다.
 */
export const useQueueStall = (
  queuedKey: string | null,
  stalledKeyRef: React.RefObject<string | null>,
) => {
  const [stalledKey, setStalledKey] = React.useState<string | null>(null)
  const [round, setRound] = React.useState(0)
  React.useEffect(() => {
    if (queuedKey == null) return
    const id = setTimeout(() => {
      stalledKeyRef.current = queuedKey
      setStalledKey(queuedKey)
    }, QUEUE_STALL_MS)
    return () => clearTimeout(id)
  }, [queuedKey, round, stalledKeyRef])
  const resume = React.useCallback(() => {
    stalledKeyRef.current = null
    setStalledKey(null)
    setRound((value) => value + 1)
  }, [stalledKeyRef])
  return {
    isStalled: queuedKey != null && stalledKey === queuedKey,
    resume,
  }
}

export type AgentRunStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED"

export type AgentRun = {
  runId: number
  /** `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED` */
  status: string
  attempt: number
  model: string | null
  promptVersion: string | null
  inputTokens: number | null
  outputTokens: number | null
  /** 비용, 백만분의 1달러 정수 */
  costMicroUsd: number | null
  queuedAt: string | null
  startedAt: string | null
  endedAt: string | null
  failureReason: string | null
}

export type AgentRunStep = {
  seq: number
  /** 서버 `AgentStepType` 코드 */
  type: string
  title: string
  summary: string
  detail: Record<string, unknown>
  /** `RUNNING`, `DONE`, `FAILED` */
  status: string
  startedAt: string | null
  endedAt: string | null
}

export type DraftClaim = {
  text: string
  quote: string | null
  /** 주장이 나온 곳. `STATEMENT`(소명) 또는 `DOCUMENT`(첨부 서류 판독). 없으면 소명으로 본다 */
  source: "STATEMENT" | "DOCUMENT"
  /** 서류에서 나온 주장이면 그 서류와 판독 영역 번호 */
  documentId: number | null
  regionIndex: number | null
}

export type DraftContradiction = {
  claim: string | null
  fact: string | null
  transactionNumbers: string[]
}

export type ReviewDraft = {
  runId: number
  /** Agent 갈래(`GateBranch` 코드). 해제 근거가 아니다 */
  branch: string
  evidenceTransactionNumbers: string[]
  missingDocuments: string[]
  claims: DraftClaim[]
  contradictions: DraftContradiction[]
  followUps: string[]
  noticeDraft: string | null
  submittedAt: string | null
}

/**
 * 판정안이 최근 실행 것이 아닌가. 서버는 이의제기별로 마지막에 저장된 판정안을 준다. 그래서
 * 새 실행이 대기 중이거나 실패로 끝나면 판정안은 이전 실행 것이다.
 */
export const isDraftStale = (
  draft: Pick<ReviewDraft, "runId"> | null,
  latestRun: Pick<AgentRun, "runId"> | null,
): boolean =>
  draft != null && latestRun != null && draft.runId !== latestRun.runId

/** 아직 끝나지 않은 실행인가. 이 동안만 폴링한다. */
export const isRunActive = (status: string | undefined): boolean =>
  status === "QUEUED" || status === "RUNNING"

export const asRecord = (value: unknown): Record<string, unknown> =>
  value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

export const asString = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null

export const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null

export const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []

const toRun = (response: AgentRunResponse): AgentRun => ({
  runId: response.runId ?? 0,
  status: response.status ?? "",
  attempt: response.attempt ?? 0,
  model: response.model ?? null,
  promptVersion: response.promptVersion ?? null,
  inputTokens: response.inputTokens ?? null,
  outputTokens: response.outputTokens ?? null,
  costMicroUsd: response.costMicroUsd ?? null,
  queuedAt: response.queuedAt ?? null,
  startedAt: response.startedAt ?? null,
  endedAt: response.endedAt ?? null,
  failureReason: response.failureReason ?? null,
})

const toStep = (response: AgentRunStepResponse): AgentRunStep => ({
  seq: response.seq ?? 0,
  type: response.type ?? "",
  title: response.title ?? "",
  summary: response.summary ?? "",
  detail: asRecord(response.detail),
  status: response.status ?? "",
  startedAt: response.startedAt ?? null,
  endedAt: response.endedAt ?? null,
})

const toDraft = (response: ReviewDraftResponse): ReviewDraft => {
  const content = asRecord(response.content)
  const claims = Array.isArray(content.claims) ? content.claims : []
  const contradictions = Array.isArray(content.contradictions)
    ? content.contradictions
    : []
  return {
    runId: response.runId ?? 0,
    branch: response.branch ?? "",
    evidenceTransactionNumbers: asStringArray(
      content.evidenceTransactionNumbers,
    ),
    missingDocuments: asStringArray(content.missingDocuments),
    claims: claims
      .map(asRecord)
      .map((claim) => ({
        text: asString(claim.text) ?? "",
        quote: asString(claim.quote),
        source:
          claim.source === "DOCUMENT"
            ? ("DOCUMENT" as const)
            : ("STATEMENT" as const),
        documentId: asNumber(claim.documentId),
        regionIndex: asNumber(claim.regionIndex),
      }))
      .filter((claim) => claim.text !== ""),
    contradictions: contradictions.map(asRecord).map((item) => ({
      claim: asString(item.claim) ?? asString(item.text),
      fact: asString(item.fact) ?? asString(item.ledgerFact),
      transactionNumbers: asStringArray(item.transactionNumbers),
    })),
    followUps: asStringArray(content.followUps),
    noticeDraft: asString(content.noticeDraft),
    submittedAt: response.submittedAt ?? null,
  }
}

/**
 * 실행 목록(`GET /admin/objections/{id}/agent-runs`, 최근부터). 가장 최근 실행이
 * 끝나지 않았으면 1초마다 다시 받는다. 재분석 요청이 새 실행을 넣으면 다시 폴링이 걸린다.
 * 대기만 1분 넘게 이어지면 멈추고 `isQueueStalled` 를 켠다. `recheck` 로 다시 받는다.
 */
export const useAgentRuns = (objectionId: number, enabled = true) => {
  // 폴링 간격 함수는 렌더 밖에서 돈다. 멈춘 대상을 그 안에서 읽도록 ref 에 둔다.
  const stalledKeyRef = React.useRef<string | null>(null)
  const { data, isPending, isError, error, refetch } =
    useListObjectionAgentRuns(objectionId, {
      query: {
        enabled,
        refetchInterval: (query) => {
          const latest = query.state.data?.[0]
          if (!isRunActive(latest?.status)) return false
          return latest?.status === "QUEUED" &&
            stalledKeyRef.current === queuedRunKey(latest.runId)
            ? false
            : AGENT_POLL_INTERVAL_MS
        },
      },
      request: POLL_REQUEST,
    })
  const runs = data?.map(toRun)
  const latestRun = runs?.[0] ?? null
  const { isStalled, resume } = useQueueStall(
    latestRun?.status === "QUEUED" ? queuedRunKey(latestRun.runId) : null,
    stalledKeyRef,
  )
  const recheck = React.useCallback(() => {
    resume()
    void refetch()
  }, [refetch, resume])
  return {
    runs,
    latestRun,
    isPending,
    isError,
    error,
    isQueueStalled: isStalled,
    recheck,
  }
}

type StepsCache = {
  steps: AgentRunStep[]
  /** 실행이 끝난 것을 안 뒤에 받은 응답인가. 그렇다면 더 올 단계가 없다 */
  isComplete: boolean
}

const agentRunStepsKey = (objectionId: number, runId: number | null) =>
  getListObjectionAgentRunStepsQueryKey(objectionId, runId ?? 0)

/**
 * 실행 타임라인(`GET .../agent-runs/{runId}/steps?after=`).
 *
 * 받은 단계를 캐시에 쌓고, 다음 요청은 마지막 순번 뒤만 묻는다. 서버는 실행 종료와 마지막
 * 단계(`GATE_EVALUATED` 또는 `FAILED`)를 한 트랜잭션에 남기므로, 실행이 끝난 것을 본 뒤에
 * 시작한 요청 한 번이면 남은 단계를 다 받는다. 그 응답을 받으면 폴링을 멈춘다.
 */
export const useAgentRunSteps = (
  objectionId: number,
  runId: number | null,
  isRunEnded: boolean,
  /** 실행이 아직 대기 중인가. 대기 중에는 단계가 생기지 않아 폴링하지 않는다 */
  isRunQueued = false,
) => {
  const queryClient = useQueryClient()
  // 폴링 함수는 렌더 밖에서 돈다. 최신 실행 상태를 그 안에서 읽도록 ref 에 둔다.
  const isRunEndedRef = React.useRef(isRunEnded)
  React.useEffect(() => {
    isRunEndedRef.current = isRunEnded
  }, [isRunEnded])

  const queryKey = agentRunStepsKey(objectionId, runId)
  const { data, isError, error } = useQuery({
    queryKey,
    enabled: runId != null,
    staleTime: Infinity,
    queryFn: async ({ signal }): Promise<StepsCache> => {
      // 요청을 보내기 전에 읽는다. 응답 뒤에 읽으면 그 사이 끝난 실행의 마지막 단계를 놓친다.
      const isComplete = isRunEndedRef.current
      const previous = queryClient.getQueryData<StepsCache>(queryKey)
      const after = previous?.steps.at(-1)?.seq ?? 0
      const fresh = await listObjectionAgentRunSteps(
        objectionId,
        runId ?? 0,
        { after },
        { signal, ...POLL_REQUEST },
      )
      const appended = fresh.map(toStep).filter((step) => step.seq > after)
      return { steps: [...(previous?.steps ?? []), ...appended], isComplete }
    },
    refetchInterval: (query) =>
      query.state.data?.isComplete || isRunQueued
        ? false
        : AGENT_POLL_INTERVAL_MS,
  })

  return { steps: data?.steps ?? [], isError, error }
}

/**
 * 최근 판정안(`GET /admin/objections/{id}/review-draft`). 없으면 `null` 이다.
 *
 * 쿼리 키에 최근 실행 번호와 상태를 넣는다. 실행이 끝나 판정안이 생기거나 재분석으로
 * 새 실행이 생기면 따로 무효화하지 않아도 다시 받는다.
 */
export const useReviewDraft = (
  objectionId: number,
  latestRun: Pick<AgentRun, "runId" | "status"> | null,
) => {
  const { data, isPending } = useQuery({
    queryKey: [
      ...getGetObjectionReviewDraftQueryKey(objectionId),
      latestRun?.runId ?? null,
      latestRun?.status ?? null,
    ],
    // 실행 상태가 바뀔 때마다 다시 받는데, 그 변화는 폴링이 알려 준 것이라 활동으로 세지 않는다
    queryFn: ({ signal }) =>
      getObjectionReviewDraft(objectionId, { signal, ...POLL_REQUEST }),
    placeholderData: keepPreviousData,
  })
  return {
    // 서버는 판정안이 없으면 `data: null` 을 준다. 스펙 타입에는 null 이 없다.
    draft: data ? toDraft(data) : null,
    isPending,
  }
}

/**
 * 재분석 요청(`POST /admin/objections/{id}/review-requests`). 멱등키 필수.
 * 확정 뒤면 `PST0302`, 진행 중 실행이 있으면 `PST0306` 이다.
 */
export const useRequestObjectionReview = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      objectionId,
      idempotencyKey,
    }: {
      objectionId: number
      idempotencyKey: string
    }) =>
      requestObjectionReview(
        objectionId,
        withIdempotencyKey({}, idempotencyKey),
      ),
    onSettled: (_data, _error, { objectionId }) =>
      queryClient.invalidateQueries({
        queryKey: getListObjectionAgentRunsQueryKey(objectionId),
      }),
  })
}

/**
 * 실행 하나의 전체 단계(`after` 생략). 재생 모드가 쓴다(계획 PA-15).
 *
 * 끝난 실행의 단계는 바뀌지 않으므로 한 번 받으면 다시 받지 않고 캐시에서 꺼낸다. 그래서
 * 한 번 불러온 뒤에는 네트워크가 끊겨도 같은 화면으로 재생된다.
 */
export const useAgentRunAllSteps = (
  objectionId: number,
  runId: number | null,
  enabled: boolean,
) => {
  const { data, isPending, isError } = useQuery({
    queryKey: [...agentRunStepsKey(objectionId, runId), "all"],
    enabled: enabled && runId != null,
    staleTime: Infinity,
    gcTime: Infinity,
    networkMode: "offlineFirst",
    queryFn: async ({ signal }) =>
      (
        await listObjectionAgentRunSteps(objectionId, runId ?? 0, undefined, {
          signal,
        })
      ).map(toStep),
  })
  return { steps: data, isPending, isError }
}
