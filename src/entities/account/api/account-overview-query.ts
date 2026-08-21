import { useGetAccounts } from "@/shared/api/generated/계좌/계좌"
import type { AccountOverviewResponse } from "@/shared/api/generated/model"

export const useAccountOverviewQuery = () => {
  const query = useGetAccounts()

  return {
    ...query,
    data: query.data as unknown as AccountOverviewResponse | undefined,
  }
}
