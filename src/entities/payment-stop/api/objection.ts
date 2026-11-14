import * as React from "react"
import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import {
  confirmObjectionDecision,
  getGetObjectionDetailQueryKey,
  getListObjectionExternalChecksQueryKey,
  getListObjectionNoticesQueryKey,
  getListObjectionsQueryKey,
  listObjections,
  receiveObjection,
  registerPaymentStopCase,
  useGetObjectionDetail,
  useListObjections,
  type DecisionRequest,
  type DecisionResponse,
  type ExternalCheckResponse,
  type ObjectionDetailResponse,
  type ObjectionSummaryResponse,
  type ReceiveRequest,
  type RegisterRequest,
  type Rule,
} from "@/shared/api/generated"
import { withIdempotencyKey } from "@/shared/api/custom-fetch"
import { useQueueStall } from "@/entities/payment-stop/api/agent-run"
import {
  DECISION_RESULTS,
  type DecisionResult,
} from "@/entities/payment-stop/lib/labels"

/**
 * 지급정지 사건과 이의제기 심사 API(서버 `paymentstop`, 계획 PA-04).
 *
 * 화면은 생성 훅을 직접 부르지 않고 이 파일을 거친다. 조회 사유 헤더와 멱등키를
 * 빠뜨릴 경로를 여기 한 곳에 모은다.
 *
 * 생성 타입은 전 필드가 선택이라 화면 모델로 한 번 채운다. 빠진 값을 어느 쪽으로
 * 채울지는 **해제를 막는 쪽**으로 정한다 — 판정 허용 여부가 빠지면 닫힌 것으로 본다.
 */

/**
 * 상세 조회 사유 헤더(PH-89). 소명 원문이 보여 서버가 사유를 요구한다.
 * ADM-01 이 같은 이름을 `entities/admin-customer` 에 두지만, 슬라이스끼리 직접
 * 참조하지 않는 규칙 때문에 이름만 여기 다시 적는다. 사유 코드 목록과 선택 상자는
 * 화면이 ADM-01 것을 그대로 쓴다.
 */
const ACCESS_REASON_HEADER = "X-Access-Reason"

export type ObjectionSummary = {
  objectionId: number
  caseId: number
  accountId: number
  clause: number
  /** 서버 `ObjectionStatus`(계약 v2 §1). `RECEIVED` 부터 `DECIDED` 까지 6단계 */
  objectionStatus: string
  /** `STOPPED`, `PARTIAL`, `RELEASED` */
  caseStatus: string
  disputedTotal: number
  /** 이의제기 신청 기한(채권소멸 공고일 기준, D31). 통보 기한이 아니다 */
  objectionDeadline: string
  receivedAt: string
  /** 심사 기한(완비 확인일 + 5영업일). 완비 확인 전과 보완 요청 중이면 `null` */
  reviewDeadline: string | null
  /** 확정 전이고 심사 기한 1영업일 전부터 켜진다(설계 불변식 6). 서버가 계산한다 */
  deadlineAlert: boolean
  /** 보완 기한. 보완 요청 중이 아니면 `null` */
  supplementDue: string | null
  /** 보완 기한이 지났는데 보완이 오지 않았다. 불수용 대상이지만 자동 확정하지 않는다(D32) */
  supplementOverdue: boolean
  /** 접수 경로(서버 `ObjectionChannel`): `BRANCH` 영업점 대리, `ONLINE` 비대면 */
  receivedChannel: string
  /** 승인 대기나 확정 판정이 해제 요건 점검과 다른 재량 판정인지 */
  discretionary: boolean
  /** 최근 AI 분석 실행 상태. 실행이 없으면 `null` */
  latestRunStatus: string | null
  /** 최근 실행의 마지막 단계 이름 */
  latestRunLastStepTitle: string | null
}

export type DisputedTransfer = {
  transactionNumber: string
  amount: number
  occurredAt: string
}

export type GateRuleCheck = {
  /** 서버 `GateRule` 코드 */
  rule: string
  description: string
  /** 서버 `RuleBasis` 코드 */
  basis: string
  matched: boolean
  /** 이 규칙 판단에 쓴 거래 번호 */
  transactionNumbers: string[]
  detail: string
}

export type ReleaseGate = {
  /** 서버 `GateBranch` 코드 */
  branch: string
  /** 간소화 신청이었지만 지급정지 이력 때문에 일반 심사로 넘어갔는지 */
  simplifiedExcluded: boolean
  rulesVersion: string
  /** 판정별로 담당자가 고를 수 있는지. 서버가 원장으로 다시 계산한 값이다 */
  allowedResults: Record<DecisionResult, boolean>
  /**
   * 해제 요건 점검은 닫혔지만 담당자 재량 판정으로 쓸 수 있는 판정. 사유와 다른 관리자의
   * 확인 승인이 필요하다. 소송 계속, 사유 조항 불일치, 외부 기관 부정 회신은 재량으로도
   * 넘지 못해 `false` 다. 불수용은 언제나 `false` 다(점검이 늘 연다)
   */
  discretionaryResults: Record<DecisionResult, boolean>
  rules: GateRuleCheck[]
}

export type ObjectionDecision = {
  /** 판정 행 번호. 승인과 반려 경로에 쓴다 */
  decisionId: number | null
  /** 서버 `DecisionStatus`: `PENDING_APPROVAL`, `CONFIRMED`, `RETURNED` */
  status: string
  result: string
  reason: string
  earlyReleaseBasis: string | null
  requestedHoldAmount: number | null
  appliedHoldAmount: number | null
  /** 판정을 작성한 관리자의 고객 번호. 이름은 응답에 없다 */
  decidedBy: number | null
  decidedAt: string
  /** 승인한 관리자의 고객 번호. 불수용처럼 승인 없이 확정되면 `null` */
  approvedBy: number | null
  approvedAt: string | null
  /** 승인자가 반려할 때 적은 사유 */
  returnReason: string | null
  /** 해제 요건 점검이 닫힌 판정을 담당자 재량으로 썼는지 */
  discretionary: boolean
  /** 재량 판정 사유(20~1000자). 재량 판정이 아니면 `null` */
  discretionaryReason: string | null
  /** 작성할 때의 해제 요건 점검 갈래(서버 `GateBranch`) */
  gateBranchAtWrite: string | null
}

export type ExternalCheck = {
  checkId: number
  /** `POLICE`(수사기관), `PEER_BANK`(관련 금융회사) */
  agency: string
  /** `REQUESTED`, `REPLIED` */
  status: string
  /** 모의 회신 코드. 회신 전이면 `null` */
  reply: string | null
  requestedAt: string | null
  repliedAt: string | null
}

export type ObjectionDetail = {
  objectionId: number
  caseId: number
  accountId: number
  /** 타행 송금이면 `null` 이다 */
  senderAccountId: number | null
  caseStatus: string
  objectionDeadline: string
  disputedTransfers: DisputedTransfer[]
  clause: number
  statement: string
  simplifiedRequested: boolean
  idCopyConfirmed: boolean
  litigationPending: boolean
  objectionStatus: string
  receivedAt: string
  /** 접수 경로(서버 `ObjectionChannel`): `BRANCH` 영업점 대리, `ONLINE` 비대면 */
  receivedChannel: string
  /** 소명 완비를 확인한 시각. 확인 전이면 `null` */
  completenessConfirmedAt: string | null
  gate: ReleaseGate
  decision: ObjectionDecision | null
  reviewDeadline: string | null
  deadlineAlert: boolean
  /** 보완 기한. 보완 요청 중이 아니면 `null` */
  supplementDue: string | null
  /** 지금까지 요청한 보완 횟수(0~2) */
  supplementRound: number
  supplementOverdue: boolean
  /** 승인 대기 판정. 수용, 일부 지급정지를 작성하면 여기에 놓인다 */
  pendingDecision: ObjectionDecision | null
  externalChecks: ExternalCheck[]
  documentCount: number
}

const toSummary = (response: ObjectionSummaryResponse): ObjectionSummary => ({
  objectionId: response.objectionId ?? 0,
  caseId: response.caseId ?? 0,
  accountId: response.accountId ?? 0,
  clause: response.clause ?? 0,
  objectionStatus: response.objectionStatus ?? "",
  caseStatus: response.caseStatus ?? "",
  disputedTotal: response.disputedTotal ?? 0,
  objectionDeadline: response.objectionDeadline ?? "",
  receivedAt: response.receivedAt ?? "",
  reviewDeadline: response.reviewDeadline ?? null,
  deadlineAlert: response.deadlineAlert ?? false,
  supplementDue: response.supplementDue ?? null,
  supplementOverdue: response.supplementOverdue ?? false,
  receivedChannel: response.receivedChannel ?? "",
  discretionary: response.discretionary ?? false,
  latestRunStatus: response.latestRunStatus ?? null,
  latestRunLastStepTitle: response.latestRunLastStepTitle || null,
})

const toRuleCheck = (rule: Rule): GateRuleCheck => ({
  rule: rule.rule ?? "",
  description: rule.description ?? "",
  basis: rule.basis ?? "",
  matched: rule.matched ?? false,
  transactionNumbers: rule.transactionNumbers ?? [],
  detail: rule.detail ?? "",
})

export const toExternalCheck = (
  response: ExternalCheckResponse,
): ExternalCheck => ({
  checkId: response.checkId ?? 0,
  agency: response.agency ?? "",
  status: response.status ?? "",
  reply: response.reply || null,
  requestedAt: response.requestedAt ?? null,
  repliedAt: response.repliedAt ?? null,
})

export const toDecision = (response: DecisionResponse): ObjectionDecision => ({
  decisionId: response.decisionId ?? null,
  status: response.status ?? "",
  result: response.result ?? "",
  reason: response.reason ?? "",
  earlyReleaseBasis: response.earlyReleaseBasis || null,
  requestedHoldAmount: response.requestedHoldAmount ?? null,
  appliedHoldAmount: response.appliedHoldAmount ?? null,
  decidedBy: response.decidedBy ?? null,
  decidedAt: response.decidedAt ?? "",
  approvedBy: response.approvedBy ?? null,
  approvedAt: response.approvedAt ?? null,
  returnReason: response.returnReason || null,
  discretionary: response.discretionary ?? false,
  discretionaryReason: response.discretionaryReason || null,
  gateBranchAtWrite: response.gateBranchAtWrite || null,
})

const toDetail = (response: ObjectionDetailResponse): ObjectionDetail => {
  const gate = response.gate ?? {}
  const allowed = gate.allowedResults ?? {}
  const discretionary = gate.discretionaryResults ?? {}
  return {
    objectionId: response.objectionId ?? 0,
    caseId: response.caseId ?? 0,
    accountId: response.accountId ?? 0,
    senderAccountId: response.senderAccountId ?? null,
    caseStatus: response.caseStatus ?? "",
    objectionDeadline: response.objectionDeadline ?? "",
    disputedTransfers: (response.disputedTransfers ?? []).map((item) => ({
      transactionNumber: item.transactionNumber ?? "",
      amount: item.amount ?? 0,
      occurredAt: item.occurredAt ?? "",
    })),
    clause: response.clause ?? 0,
    statement: response.statement ?? "",
    simplifiedRequested: response.simplifiedRequested ?? false,
    idCopyConfirmed: response.idCopyConfirmed ?? false,
    litigationPending: response.litigationPending ?? false,
    objectionStatus: response.objectionStatus ?? "",
    receivedAt: response.receivedAt ?? "",
    receivedChannel: response.receivedChannel ?? "",
    completenessConfirmedAt: response.completenessConfirmedAt ?? null,
    gate: {
      branch: gate.branch ?? "",
      simplifiedExcluded: gate.simplifiedExcluded ?? false,
      rulesVersion: gate.rulesVersion ?? "",
      // 값이 빠진 판정은 닫는다. 열어 두면 서버가 막을 판정을 화면이 권하게 된다.
      allowedResults: Object.fromEntries(
        DECISION_RESULTS.map((result) => [result, allowed[result] === true]),
      ) as Record<DecisionResult, boolean>,
      // 재량 판정도 값이 빠지면 닫는다. 서버가 열지 않은 재량을 화면이 권하지 않는다.
      discretionaryResults: Object.fromEntries(
        DECISION_RESULTS.map((result) => [
          result,
          discretionary[result] === true,
        ]),
      ) as Record<DecisionResult, boolean>,
      rules: (gate.rules ?? []).map(toRuleCheck),
    },
    decision: response.decision ? toDecision(response.decision) : null,
    reviewDeadline: response.reviewDeadline ?? null,
    deadlineAlert: response.deadlineAlert ?? false,
    supplementDue: response.supplementDue ?? null,
    supplementRound: response.supplementRound ?? 0,
    supplementOverdue: response.supplementOverdue ?? false,
    pendingDecision: response.pendingDecision
      ? toDecision(response.pendingDecision)
      : null,
    externalChecks: (response.externalChecks ?? []).map(toExternalCheck),
    documentCount: response.documentCount ?? 0,
  }
}

/** 목록의 AI 분석 상태 칸을 다시 받는 간격. 상세보다 느슨하게 둔다. */
const LIST_POLL_INTERVAL_MS = 2000

/** 대기 중인 행을 하나의 값으로 묶는다. 대기 행이 바뀌면 멈춤 시계를 다시 잰다. */
const queuedRowsKey = (rows: readonly ObjectionSummaryResponse[]) => {
  const ids = rows
    .filter((row) => row.latestRunStatus === "QUEUED")
    .map((row) => row.objectionId)
  return ids.length > 0 ? ids.join(",") : null
}

/**
 * 이의제기 목록(`GET /admin/objections`). 서버가 최근 접수 순 200건을 준다.
 * 분석 중인 행이 있으면 목록을 2초마다 다시 받아 분석 상태 칸을 갱신한다.
 *
 * 다시 받기는 유휴 타이머의 활동으로 세지 않는다. 처음 받기(화면을 연 것)만 센다. 진행 중
 * (`RUNNING`) 행 없이 대기(`QUEUED`) 행만 1분 넘게 그대로면 폴링을 멈춘다. 워커가 없는
 * 환경에서는 대기가 끝나지 않아 200건 목록을 끝없이 다시 받게 되기 때문이다.
 * `isQueueStalled` 가 켜지면 화면이 안내하고 `recheck` 로 다시 받는다.
 */
export const useObjectionList = () => {
  const queryClient = useQueryClient()
  // 폴링 간격 함수는 렌더 밖에서 돈다. 멈춘 대상을 그 안에서 읽도록 ref 에 둔다.
  const stalledKeyRef = React.useRef<string | null>(null)
  const { data, isPending, isFetching, isError, error, refetch } =
    useListObjections({
      query: {
        queryFn: ({ signal }) =>
          listObjections({
            signal,
            background:
              queryClient.getQueryData(getListObjectionsQueryKey()) !==
              undefined,
          }),
        refetchInterval: (query) => {
          const rows = query.state.data ?? []
          if (rows.some((row) => row.latestRunStatus === "RUNNING")) {
            return LIST_POLL_INTERVAL_MS
          }
          const key = queuedRowsKey(rows)
          return key != null && stalledKeyRef.current !== key
            ? LIST_POLL_INTERVAL_MS
            : false
        },
      },
    })
  const hasRunning =
    data?.some((row) => row.latestRunStatus === "RUNNING") ?? false
  const { isStalled, resume } = useQueueStall(
    hasRunning ? null : queuedRowsKey(data ?? []),
    stalledKeyRef,
  )
  const recheck = React.useCallback(() => {
    resume()
    void refetch()
  }, [refetch, resume])
  return {
    objections: data?.map(toSummary),
    isPending,
    isFetching,
    isError,
    error,
    isQueueStalled: isStalled,
    recheck,
  }
}

/**
 * 이의제기 상세(`GET /admin/objections/{objectionId}`). 사유가 `null` 이면 요청하지 않는다.
 *
 * 쿼리 키에 사유를 넣는다. 사유만 바꿔도 다시 요청해야 서버 조회 감사에 바뀐 사유가 남는다.
 * 해제 요건 점검은 조회 시점 원장으로 서버가 다시 계산한다.
 */
export const useObjectionDetail = (
  objectionId: number,
  accessReason: string | null,
) => {
  const isValidId = Number.isInteger(objectionId) && objectionId > 0
  const { data, isPending, isError, error } = useGetObjectionDetail(
    objectionId,
    {
      query: {
        queryKey: [...getGetObjectionDetailQueryKey(objectionId), accessReason],
        enabled: isValidId && accessReason != null,
      },
      request: accessReason
        ? { headers: { [ACCESS_REASON_HEADER]: accessReason } }
        : undefined,
    },
  )

  return {
    objection: data ? toDetail(data) : undefined,
    isPending,
    isError,
    error,
  }
}

/**
 * 이의제기 하나의 상태가 바뀐 뒤 다시 받을 쿼리. 상세(사유가 키 뒤에 붙는다), 목록,
 * 통지 기록, 외부 확인을 다시 받는다. 분석 타임라인은 상태 변경과 무관해 건드리지 않는다.
 * 통지 기록도 넣는 이유는 판정과 보완 요청이 서버에서 통지를 함께 기록하는데, 창에 초점이
 * 돌아와도 다시 받지 않는 설정(`query-client.ts`)이라 저절로 갱신되지 않기 때문이다.
 */
export const invalidateObjection = (
  queryClient: QueryClient,
  objectionId: number,
) =>
  Promise.all([
    queryClient.invalidateQueries({
      queryKey: getGetObjectionDetailQueryKey(objectionId),
    }),
    queryClient.invalidateQueries({ queryKey: getListObjectionsQueryKey() }),
    queryClient.invalidateQueries({
      queryKey: getListObjectionNoticesQueryKey(objectionId),
    }),
    queryClient.invalidateQueries({
      queryKey: getListObjectionExternalChecksQueryKey(objectionId),
    }),
  ])

/** 멱등키를 함께 받는 변경 요청. 키는 화면이 제출 한 건마다 정해 넘긴다. */
type Keyed<TRequest> = { request: TRequest; idempotencyKey: string }

/**
 * 지급정지 사건 등록(`POST /admin/payment-stops`). 등록과 동시에 계좌를 전부 지급정지한다.
 * 다툼 거래가 그 계좌의 최근 180일 성공 입금이 아니면 서버가 `PST0001` 로 거부한다.
 */
export const useRegisterPaymentStopCase = () =>
  useMutation({
    mutationFn: ({ request, idempotencyKey }: Keyed<RegisterRequest>) =>
      registerPaymentStopCase(request, withIdempotencyKey({}, idempotencyKey)),
  })

/** 이의제기 접수(`POST /admin/objections`). 영업점 대리 접수(D34)다. */
export const useReceiveObjection = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ request, idempotencyKey }: Keyed<ReceiveRequest>) =>
      receiveObjection(request, withIdempotencyKey({}, idempotencyKey)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: getListObjectionsQueryKey() }),
  })
}

/**
 * 판정 작성(`POST /admin/objections/{objectionId}/decisions`). 불수용은 바로 확정되고,
 * 수용과 일부 지급정지는 승인 대기로 저장만 된다(2인 승인, 계약 v2 §3). 응답 `status` 로 가른다.
 *
 * 응답 시간 초과 뒤 같은 키로 다시 보내면 서버가 처음 결과를 그대로 돌려준다.
 * 작성 뒤 상세, 목록, 통지 기록을 다시 받아 확정된 판정이나 승인 대기를 보인다.
 *
 * 해제 요건 점검이 닫혔지만 `gate.discretionaryResults` 가 연 판정은 `discretionary: true` 와
 * 재량 판정 사유로 쓴다. 재량으로도 넘을 수 없는 요건이면 서버가 `PST0310` 으로 거부한다.
 *
 * 실패해도 다시 받는다. 해제 요건 미충족(`PST0301`, `PST0310`), 이미 확정(`PST0302`), 상태가 맞지
 * 않음(`PST0308`)은 모두 화면의 상세가 서버보다 늦었다는 뜻이다. 서버는 확정 직전에 요건을
 * 다시 계산하므로(D11) 화면을 연 뒤 원장이 바뀌었을 수 있고, 다른 담당자가 먼저 승인 대기를
 * 올렸거나 보완을 요청했을 수도 있다. 화면이 옛 상태를 계속 보이면 같은 실패를 되풀이한다.
 */
export const useConfirmObjectionDecision = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      objectionId,
      request,
      idempotencyKey,
    }: Keyed<DecisionRequest> & { objectionId: number }) =>
      confirmObjectionDecision(
        objectionId,
        request,
        withIdempotencyKey({}, idempotencyKey),
      ),
    onSettled: (_data, _error, { objectionId }) =>
      invalidateObjection(queryClient, objectionId),
  })
}
