import { useGetTransactions } from "@/shared/api/generated/account-controller/account-controller"
import type {
  AccountTransactionResponse,
  GetTransactionsParams,
} from "@/shared/api/generated/model"

export const useAccountTransactionQuery = (
  accountId: number | null,
  params: GetTransactionsParams,
) => {
  const query = useGetTransactions(accountId ?? 0, params, {
    query: {
      enabled: accountId !== null,
    },
  })

  return {
    ...query,
    data: query.data as unknown as AccountTransactionResponse | undefined,
  }
}
