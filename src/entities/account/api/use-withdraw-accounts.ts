import * as React from "react"
import { useAccountOverviewQuery } from "@/entities/account/api/account-overview-query"
import type { AccountItemResponse } from "@/shared/api/generated"
import type { AccountOption } from "@/shared/types/account"

/**
 * 출금계좌로 쓸 수 있는 보유 계좌 목록.
 *
 * "출금계좌 자격"의 정의를 여기 한 곳에 둔다 — 자동이체 등록(G-01)·예약이체 등록(E-01)·
 * 자동이체 조회(G-04)가 같은 조건을 각자 복제하고 있었다. 조건이 바뀌면 이 파일만 고친다.
 */
export const useWithdrawAccounts = (): {
  accounts: AccountItemResponse[]
  /** 이체·상품가입 화면이 셀렉트에 그대로 넘기는 형태. */
  options: AccountOption[]
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

  const options = React.useMemo(
    () =>
      accounts.map((a) => ({
        alias: a.accountName ?? "",
        accountNo: a.accountNumber ?? "",
        balance: a.balance ?? 0,
        // AccountItemResponse 에 출금가능금액 필드가 없어 잔액을 그대로 쓴다.
        withdrawable: a.balance ?? 0,
      })),
    [accounts],
  )

  return { accounts, options, isLoading, isError, error }
}
