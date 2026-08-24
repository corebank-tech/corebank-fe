import { useGetAccountDetail } from "@/shared/api/generated"

export const useAccountDetailQuery = (accountId: number | null) =>
  useGetAccountDetail(accountId ?? 0, {
    query: {
      enabled: accountId != null,
    },
  })
