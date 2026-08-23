import { getGetMeQueryKey, useGetMe } from "@/shared/api/generated"
import type { CustomerInfoResponse } from "@/shared/api/generated"

export type CustomerInfo = CustomerInfoResponse

/** F-01 로그인 고객정보 조회. */
export const useCustomerProfileQuery = () => useGetMe()
export const getCustomerProfileQueryKey = () => getGetMeQueryKey()
