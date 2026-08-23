export {
  getCustomerProfileQueryKey,
  useCustomerProfileQuery,
  type CustomerInfo,
} from "@/entities/customer/api/customer-profile-query"

export {
  CUSTOMER_EMAIL_CHANGE_PURPOSE,
  useCustomerEmailVerificationIssueMutation,
  useCustomerEmailVerificationMutation,
  useCustomerProfileUpdateMutation,
} from "@/entities/customer/api/customer-profile-mutation"

export type { CustomerProfile } from "@/entities/customer/api/f01-profile"
export { MOCK_PROFILE } from "@/entities/customer/api/f01-profile"
