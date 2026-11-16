import { daysBetween } from "@/shared/lib/date"

export type DepositTerminationKind = "maturity" | "early"

export type DepositTerminationAction =
  | { available: true; kind: DepositTerminationKind }
  | { available: false; message: string }

/**
 * 예·적금 목록에서 계좌 상태와 만기일로 해지 유형을 고른다.
 * 서버 상태와 날짜가 어긋난 ACTIVE(만기 당일·경과)는 만기해지도 중도해지도 시키지 않는다.
 */
export const getDepositTerminationAction = (
  status: string | undefined,
  maturityDate: string | null | undefined,
  today: string,
): DepositTerminationAction => {
  if (status === "MATURED") {
    return { available: true, kind: "maturity" }
  }

  if (status === "SUSPENDED") {
    return { available: false, message: "거래정지" }
  }

  if (status !== "ACTIVE" || !maturityDate) {
    return { available: false, message: "해지 불가" }
  }

  if (daysBetween(today, maturityDate) > 0) {
    return { available: true, kind: "early" }
  }

  return { available: false, message: "상태 갱신 중" }
}

export const parseDepositTerminationKind = (
  value: string | undefined,
): DepositTerminationKind | null =>
  value === "maturity" || value === "early" ? value : null

export const DEPOSIT_ACCOUNTS_PATH = "/accounts/deposits"

export const getDepositTerminationPath = (
  accountId: number,
  kind: DepositTerminationKind,
  step: 1 | 2 | 3,
) => `${DEPOSIT_ACCOUNTS_PATH}/${accountId}/termination/${kind}/${step}`
