import {
  MY_DECISION_RESULT_LABEL,
  MY_OBJECTION_FINAL_ERROR_CODES,
  MY_OBJECTION_STATUS_LABEL,
  labelOf,
  useMyPaymentStops,
  type MyPaymentStop,
} from "@/entities/payment-stop"
import { isApiError, toErrorMessage } from "@/shared/api/api-error"

/** 이의제기 고객 화면 세 개가 함께 쓰는 경로와 판정. */

export const MY_PAYMENT_STOPS_PATH = "/support/payment-stops"

export const applyPathOf = (caseId: number) =>
  `${MY_PAYMENT_STOPS_PATH}/${caseId}/objection`

export const supplementPathOf = (caseId: number) =>
  `${MY_PAYMENT_STOPS_PATH}/${caseId}/supplement`

/** 확정됐으면 심사결과를, 아니면 진행 상태를 보인다. */
export const statusTextOf = (item: MyPaymentStop) => {
  if (item.objectionStatus == null) return "신청 전"
  if (item.decisionResult != null) {
    return labelOf(MY_DECISION_RESULT_LABEL, item.decisionResult)
  }
  return labelOf(MY_OBJECTION_STATUS_LABEL, item.objectionStatus)
}

/** 신청 기한이 지났는지. 오늘이 기한 날이면 아직 신청할 수 있다. */
export const isDeadlinePassed = (item: MyPaymentStop, today: string) =>
  item.objectionDeadline !== "" && item.objectionDeadline < today

/**
 * 경로의 사건 번호로 내 사건을 찾는다. 사건 하나를 따로 주는 API 가 없어 목록에서 고른다.
 * 숫자가 아닌 번호는 찾지 않는다.
 */
export const useMyCase = (rawCaseId: string | undefined) => {
  const query = useMyPaymentStops()
  const caseId = Number(rawCaseId)
  const item = Number.isInteger(caseId)
    ? query.cases?.find((candidate) => candidate.caseId === caseId)
    : undefined
  return { ...query, item }
}

/**
 * 제출 실패. 다시 내도 같은 결과인 거부(`final`)는 다시 제출 대신 목록으로 안내하고,
 * `code` 로 문제별 안내(첨부 한도 등)를 고른다.
 */
export type SubmitFailure = {
  message: string | null
  code: string | null
  final: boolean
}

export const toSubmitFailure = (error: unknown): SubmitFailure => {
  const code = isApiError(error) ? error.code : null
  return {
    message: toErrorMessage(error),
    code,
    final: code != null && MY_OBJECTION_FINAL_ERROR_CODES.has(code),
  }
}
