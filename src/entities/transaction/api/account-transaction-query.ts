import { keepPreviousData } from "@tanstack/react-query"
import { useGetTransactions } from "@/shared/api/generated/account-controller/account-controller"
import type {
  AccountTransactionResponse,
  GetTransactionsParams,
} from "@/shared/api/generated/model"

export const useAccountTransactionQuery = (
  accountId: number | null,
  params: GetTransactionsParams,
) => {
  // generated hook은 accountId를 number로 요구한다.
  // accountId가 null인 동안 enabled=false이므로 sentinel 0은 실제 요청에 사용되지 않는다.
  const query = useGetTransactions(accountId ?? 0, params, {
    query: {
      enabled: accountId !== null,
      placeholderData: keepPreviousData,
    },
  })

  return {
    ...query,
    data: query.data as unknown as AccountTransactionResponse | undefined,
  }
}
