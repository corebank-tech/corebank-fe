import {
  useGetAdminInfoDepositBalances,
  useGetAdminInfoProductSubscriptions,
  type DepositBalancesResponse,
  type ProductSubscriptionsResponse,
} from "@/shared/api/generated"

/**
 * 정보계 지표 하나. **기준시점(`asOf`)이 없으면 값도 없다** — 기준시점 없는 숫자는
 * 표시하지 않는다(REQ-ADM-032). 화면이 이 규칙을 다시 판단하지 않게 여기서 묶는다.
 */
export type InfoMetric<T> =
  { kind: "loaded"; asOf: string; value: T } | { kind: "notLoaded" }

/** 당월 가입·해지. `month` 는 서버가 고른 달(asOf 가 속한 달)이다. */
export type MonthlySubscriptions = {
  month: string
  subscribedCount: number
  closedCount: number
}

/**
 * 총 예수금 잔액은 기준일(`asOf`) 하루치 값이다. 목록은 asOf 이하 영업일 잔액이라
 * 마지막 행을 고르지 않고 날짜로 찾는다 — asOf 행이 없으면 값을 내지 않는다.
 */
export const toDepositBalanceMetric = (
  response: DepositBalancesResponse,
): InfoMetric<number> => {
  const asOf = response.asOf
  const onAsOf = response.items?.find((item) => item.baseDate === asOf)
  if (!asOf || onAsOf?.totalBalance == null) return { kind: "notLoaded" }
  return { kind: "loaded", asOf, value: onAsOf.totalBalance }
}

export const toMonthlySubscriptionsMetric = (
  response: ProductSubscriptionsResponse,
): InfoMetric<MonthlySubscriptions> => {
  const { asOf, month, subscribedCount, closedCount } = response
  if (!asOf || !month || subscribedCount == null || closedCount == null) {
    return { kind: "notLoaded" }
  }
  return {
    kind: "loaded",
    asOf,
    value: { month, subscribedCount, closedCount },
  }
}

/**
 * 총 예수금 잔액(`GET /admin/info/deposit-balances`, PH-77). 기간을 보내지 않아
 * 서버가 asOf 부터 거슬러 30일을 준다 — 그중 asOf 하루만 쓴다.
 */
export const useDepositBalanceMetric = () => {
  const { data, isPending, isError, error } = useGetAdminInfoDepositBalances()
  return {
    metric: data ? toDepositBalanceMetric(data) : undefined,
    isPending,
    isError,
    error,
  }
}

/**
 * 당월 가입·해지(`GET /admin/info/product-subscriptions`, PH-77).
 *
 * `month` 를 보내지 않는다. 오늘이 속한 달로 물으면, 적재가 아직 지난달에 머문 월초에
 * 새 달 0건이 지난달 기준시점과 함께 표시되어 0이 사실처럼 읽힌다. 비워 두면 서버가
 * asOf 가 속한 달을 고르고 그 달을 응답 `month` 로 알려 준다.
 */
export const useMonthlySubscriptionsMetric = () => {
  const { data, isPending, isError, error } =
    useGetAdminInfoProductSubscriptions()
  return {
    metric: data ? toMonthlySubscriptionsMetric(data) : undefined,
    isPending,
    isError,
    error,
  }
}
