import * as React from "react"
import { useAccountOverviewQuery } from "@/entities/account/api/account-overview-query"

export type DashboardAccount = {
  id: string
  alias: string
  accountNo: string
  openedDate: string
  lastTxDate: string | null
  balance: number
  transferEnabled: boolean
}

export const useDashboardAccounts = () => {
  const {
    data: overview,
    isLoading,
    isError,
    error,
  } = useAccountOverviewQuery()

  const accounts = React.useMemo<DashboardAccount[]>(() => {
    return (overview?.items ?? []).flatMap((group) =>
      (group.accounts ?? []).flatMap((account) => {
        if (
          account.accountId == null ||
          account.accountNumber == null ||
          account.openedDate == null
        ) {
          return []
        }

        return [
          {
            id: String(account.accountId),
            alias: account.accountName ?? "",
            accountNo: account.accountNumber,
            openedDate: account.openedDate,
            lastTxDate: account.lastTransactionAt ?? null,
            balance: account.balance ?? 0,
            transferEnabled: account.transferEnabled === true,
          },
        ]
      }),
    )
  }, [overview])

  const primaryAccount = React.useMemo(() => {
    const primaryAccountId = (overview?.items ?? [])
      .find((group) => group.groupCode === "DEMAND_DEPOSIT")
      ?.accounts?.find((account) => account.accountId != null)?.accountId

    if (primaryAccountId == null) {
      return null
    }

    return (
      accounts.find((account) => account.id === String(primaryAccountId)) ??
      null
    )
  }, [accounts, overview])

  return {
    accounts,
    primaryAccount,
    totalAssets: overview?.totalAssets ?? 0,
    isLoading,
    isError,
    error,
  }
}
