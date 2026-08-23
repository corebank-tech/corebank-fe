import {
  IssueEmailVerificationRequestPurpose,
  useIssueEmailVerification,
  useUpdateMe,
  useVerifyEmail,
} from "@/shared/api/generated"

/** F-01 로그인 고객정보 변경. */
export const useCustomerProfileUpdateMutation = () => useUpdateMe()

/** F-01 이메일 변경용 인증번호 발급. */
export const useCustomerEmailVerificationIssueMutation = () =>
  useIssueEmailVerification()

/** F-01 이메일 인증번호 검증. */
export const useCustomerEmailVerificationMutation = () => useVerifyEmail()

export const CUSTOMER_EMAIL_CHANGE_PURPOSE =
  IssueEmailVerificationRequestPurpose.EMAIL_CHANGE
