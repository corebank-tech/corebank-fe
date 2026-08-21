import { useGetAccounts } from "@/shared/api/generated/account-controller/account-controller"
import type { AccountOverviewResponse } from "@/shared/api/generated/model"

export const useAccountOverviewQuery = () => {
  const query = useGetAccounts()

  return {
    ...query,
    data: query.data as unknown as AccountOverviewResponse | undefined,
  }
}
