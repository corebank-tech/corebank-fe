import * as React from "react"
import { useAccountOverviewQuery } from "@/entities/account/api/account-overview-query"

export type InquirableAccountGroupCode = "DEMAND_DEPOSIT" | "DEPOSIT_SAVINGS"

export type InquirableAccount = {
  accountId: number
  groupCode: InquirableAccountGroupCode
  accountName: string
  accountNumber: string
  balance: number
  openedDate: string
  lastTransactionAt: string | null
  maturityDate: string | null
  transferEnabled: boolean
  status: "ACTIVE" | "SUSPENDED"
}

export const useInquirableAccounts = () => {
  const {
    data: overview,
    isLoading,
    isError,
    error,
  } = useAccountOverviewQuery()

  const accounts = React.useMemo<InquirableAccount[]>(() => {
    return (overview?.items ?? []).flatMap((group) => {
      if (
        group.groupCode !== "DEMAND_DEPOSIT" &&
        group.groupCode !== "DEPOSIT_SAVINGS"
      ) {
        return []
      }

      const groupCode = group.groupCode

      return (group.accounts ?? []).flatMap((account) => {
        if (account.accountId == null) {
          return []
        }

        if (account.status !== "ACTIVE" && account.status !== "SUSPENDED") {
          return []
        }

        return [
          {
            accountId: account.accountId,
            groupCode,
            accountName: account.accountName ?? "",
            accountNumber: account.accountNumber ?? "",
            balance: account.balance ?? 0,
            openedDate: account.openedDate ?? "",
            lastTransactionAt: account.lastTransactionAt ?? null,
            maturityDate: account.maturityDate ?? null,
            transferEnabled: account.transferEnabled ?? false,
            status: account.status,
          },
        ]
      })
    })
  }, [overview])

  return {
    overview,
    accounts,
    isLoading,
    isError,
    error,
  }
}
