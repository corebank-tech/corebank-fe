import { keepPreviousData } from "@tanstack/react-query"
import {
  useGetTransactions,
  type GetTransactionsParams,
} from "@/shared/api/generated"

export const useAccountTransactionQuery = (
  accountId: number | null,
  params: GetTransactionsParams,
) => {
  // generated hook은 accountId를 number로 요구한다.
  // accountId가 null인 동안 enabled=false이므로 sentinel 0은 실제 요청에 사용되지 않는다.
  return useGetTransactions(accountId ?? 0, params, {
    query: {
      enabled: accountId !== null,
      placeholderData: keepPreviousData,
    },
  })
}
