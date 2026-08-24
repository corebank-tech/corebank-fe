import * as React from "react"
import { useAccountOverviewQuery } from "@/entities/account/api/account-overview-query"
import type { AccountItemResponse } from "@/shared/api/generated"

/**
 * 출금계좌로 쓸 수 있는 보유 계좌 목록.
 *
 * "출금계좌 자격"의 정의를 여기 한 곳에 둔다 — 자동이체 등록(G-01)·예약이체 등록(E-01)·
 * 자동이체 조회(G-04)가 같은 조건을 각자 복제하고 있었다. 조건이 바뀌면 이 파일만 고친다.
 */
export const useWithdrawAccounts = (): {
  accounts: AccountItemResponse[]
  isLoading: boolean
  isError: boolean
  error: unknown
} => {
  const {
    data: overview,
    isLoading,
    isError,
    error,
  } = useAccountOverviewQuery()

  const accounts = React.useMemo(() => {
    const items = (overview?.items ?? []).flatMap((g) => g.accounts ?? [])
    // 출금계좌로 쓸 수 있는 건 입출금계좌 중 이체 가능한 활성 계좌뿐이다.
    return items.filter(
      (a) =>
        a.accountType === "DEMAND_DEPOSIT" &&
        a.status === "ACTIVE" &&
        a.transferEnabled,
    )
  }, [overview])

  return { accounts, isLoading, isError, error }
}
