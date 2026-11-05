import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  confirmObjectionDecision,
  getGetObjectionDetailQueryKey,
  getListObjectionsQueryKey,
  receiveObjection,
  registerPaymentStopCase,
  useGetObjectionDetail,
  useListObjections,
  type DecisionRequest,
  type DecisionResponse,
  type ObjectionDetailResponse,
  type ObjectionSummaryResponse,
  type ReceiveRequest,
  type RegisterRequest,
  type Rule,
} from "@/shared/api/generated"
import { withIdempotencyKey } from "@/shared/api/custom-fetch"
import { isApiError } from "@/shared/api/api-error"
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
  /** `RECEIVED`(판정 대기), `DECIDED`(판정 확정) */
  objectionStatus: string
  /** `STOPPED`, `PARTIAL`, `RELEASED` */
  caseStatus: string
  disputedTotal: number
  /** 이의제기 신청 기한(채권소멸 공고일 기준, D31). 통보 기한이 아니다 */
  objectionDeadline: string
  receivedAt: string
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
  rules: GateRuleCheck[]
}

export type ObjectionDecision = {
  result: string
  reason: string
  earlyReleaseBasis: string | null
  requestedHoldAmount: number | null
  appliedHoldAmount: number | null
  /** 확정한 관리자의 고객 번호. 이름은 응답에 없다 */
  decidedBy: number | null
  decidedAt: string
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
  gate: ReleaseGate
  decision: ObjectionDecision | null
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
})

const toRuleCheck = (rule: Rule): GateRuleCheck => ({
  rule: rule.rule ?? "",
  description: rule.description ?? "",
  basis: rule.basis ?? "",
  matched: rule.matched ?? false,
  transactionNumbers: rule.transactionNumbers ?? [],
  detail: rule.detail ?? "",
})

const toDecision = (response: DecisionResponse): ObjectionDecision => ({
  result: response.result ?? "",
  reason: response.reason ?? "",
  earlyReleaseBasis: response.earlyReleaseBasis || null,
  requestedHoldAmount: response.requestedHoldAmount ?? null,
  appliedHoldAmount: response.appliedHoldAmount ?? null,
  decidedBy: response.decidedBy ?? null,
  decidedAt: response.decidedAt ?? "",
})

const toDetail = (response: ObjectionDetailResponse): ObjectionDetail => {
  const gate = response.gate ?? {}
  const allowed = gate.allowedResults ?? {}
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
    gate: {
      branch: gate.branch ?? "",
      simplifiedExcluded: gate.simplifiedExcluded ?? false,
      rulesVersion: gate.rulesVersion ?? "",
      // 값이 빠진 판정은 닫는다. 열어 두면 서버가 막을 판정을 화면이 권하게 된다.
      allowedResults: Object.fromEntries(
        DECISION_RESULTS.map((result) => [result, allowed[result] === true]),
      ) as Record<DecisionResult, boolean>,
      rules: (gate.rules ?? []).map(toRuleCheck),
    },
    decision: response.decision ? toDecision(response.decision) : null,
  }
}

/** 이의제기 목록(`GET /admin/objections`). 서버가 최근 접수 순 200건을 준다. */
export const useObjectionList = () => {
  const { data, isPending, isFetching, isError, error } = useListObjections()
  return {
    objections: data?.map(toSummary),
    isPending,
    isFetching,
    isError,
    error,
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

/** 화면의 상세가 서버 상태보다 늦었다는 뜻의 오류 코드. */
const STALE_DETAIL_CODES = new Set(["PST0301", "PST0302"])

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
 * 판정 확정(`POST /admin/objections/{objectionId}/decisions`). 1인 확정 단계다.
 *
 * 응답 시간 초과 뒤 같은 키로 다시 보내면 서버가 처음 확정 결과를 그대로 돌려준다.
 * 확정 뒤 상세와 목록을 다시 받아 확정된 판정과 지급정지 상태를 보인다.
 *
 * 해제 요건 미충족(`PST0301`)과 이미 확정(`PST0302`)도 상세를 다시 받는다. 서버는 확정
 * 직전에 요건을 다시 계산하므로(D11) 화면을 연 뒤 원장이 바뀌었을 수 있고, 다른 담당자가
 * 먼저 확정했을 수도 있다. 화면이 옛 점검 결과를 계속 보이면 같은 실패를 되풀이한다.
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
    onError: (error, { objectionId }) => {
      if (!isApiError(error) || !STALE_DETAIL_CODES.has(error.code)) return
      return queryClient.invalidateQueries({
        queryKey: getGetObjectionDetailQueryKey(objectionId),
      })
    },
    onSuccess: (_, { objectionId }) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: getGetObjectionDetailQueryKey(objectionId),
        }),
        queryClient.invalidateQueries({
          queryKey: getListObjectionsQueryKey(),
        }),
      ]),
  })
}
