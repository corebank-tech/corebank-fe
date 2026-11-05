import * as React from "react"
import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import {
  getGetObjectionReviewDraftQueryKey,
  getListObjectionAgentRunStepsQueryKey,
  getListObjectionAgentRunsQueryKey,
  getObjectionReviewDraft,
  listObjectionAgentRuns,
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
 * 판정안과 단계 상세(`detail`, `content`)는 스펙상 자유 형식 JSON 이라 여기서 모양을
 * 확인하며 읽는다. 모르는 값은 버리고, 빠진 값은 빈 목록으로 둔다.
 */

/** 실시간 표시 간격(D20). */
export const AGENT_POLL_INTERVAL_MS = 1000

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

export type DraftClaim = { text: string; quote: string | null }

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

/** 아직 끝나지 않은 실행인가. 이 동안만 폴링한다. */
export const isRunActive = (status: string | undefined): boolean =>
  status === "QUEUED" || status === "RUNNING"

export const asRecord = (value: unknown): Record<string, unknown> =>
  value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

export const asString = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null

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
 */
export const useAgentRuns = (objectionId: number, enabled = true) => {
  const { data, isPending, isError, error } = useListObjectionAgentRuns(
    objectionId,
    {
      query: {
        enabled,
        refetchInterval: (query) =>
          isRunActive(query.state.data?.[0]?.status)
            ? AGENT_POLL_INTERVAL_MS
            : false,
      },
    },
  )
  const runs = data?.map(toRun)
  return { runs, latestRun: runs?.[0] ?? null, isPending, isError, error }
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
        { signal },
      )
      const appended = fresh.map(toStep).filter((step) => step.seq > after)
      return { steps: [...(previous?.steps ?? []), ...appended], isComplete }
    },
    refetchInterval: (query) =>
      query.state.data?.isComplete ? false : AGENT_POLL_INTERVAL_MS,
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
    queryFn: ({ signal }) => getObjectionReviewDraft(objectionId, { signal }),
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

/** 목록의 AI 분석 상태 칸을 다시 받는 간격. 상세보다 느슨하게 둔다. */
const LIST_POLL_INTERVAL_MS = 2000

export type AgentRunSnapshot = {
  /** 응답을 받았는가. 받기 전과 실행이 없는 것을 가른다 */
  isLoaded: boolean
  /** 최근 실행 상태. 실행이 없으면 `null` */
  status: string | null
  /** 분석 중일 때 마지막으로 남은 단계 이름 */
  currentStepTitle: string | null
}

/**
 * 목록 행마다 최근 실행 상태를 받는다. **이의제기 하나에 요청 하나다(N+1).** 목록 응답에
 * 분석 상태가 없어서다. 그래서 화면에 보이는 쪽의 행(최대 10건)만 넘겨 받는다. 서버 목록에
 * 요약 칸이 생기면 이 훅을 걷어낸다.
 *
 * 분석 중인 행은 단계 목록을 한 번 더 받아 마지막 단계 이름을 보인다.
 */
export const useAgentRunSnapshots = (
  objectionIds: number[],
): Map<number, AgentRunSnapshot> => {
  const runQueries = useQueries({
    queries: objectionIds.map((objectionId) => ({
      queryKey: getListObjectionAgentRunsQueryKey(objectionId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        listObjectionAgentRuns(objectionId, { signal }),
      refetchInterval: (query: { state: { data?: AgentRunResponse[] } }) =>
        isRunActive(query.state.data?.[0]?.status)
          ? LIST_POLL_INTERVAL_MS
          : false,
    })),
  })
  const latestRuns = objectionIds.map((objectionId, index) => ({
    objectionId,
    run: runQueries[index]?.data?.[0],
  }))
  const running = latestRuns.filter(({ run }) => run?.status === "RUNNING")
  const stepQueries = useQueries({
    queries: running.map(({ objectionId, run }) => ({
      queryKey: [
        ...getListObjectionAgentRunStepsQueryKey(objectionId, run?.runId ?? 0),
        "list-latest",
      ],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        listObjectionAgentRunSteps(
          objectionId,
          run?.runId ?? 0,
          { after: 0 },
          { signal },
        ),
      refetchInterval: LIST_POLL_INTERVAL_MS,
    })),
  })

  const snapshots = new Map<number, AgentRunSnapshot>()
  latestRuns.forEach(({ objectionId, run }) => {
    const stepIndex = running.findIndex(
      (item) => item.objectionId === objectionId,
    )
    const lastStep =
      stepIndex >= 0 ? stepQueries[stepIndex]?.data?.at(-1) : undefined
    snapshots.set(objectionId, {
      isLoaded:
        runQueries[objectionIds.indexOf(objectionId)]?.isSuccess ?? false,
      status: run?.status ?? null,
      currentStepTitle: lastStep?.title || null,
    })
  })
  return snapshots
}
