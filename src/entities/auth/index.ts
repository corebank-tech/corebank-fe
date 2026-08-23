export type { VerifyAccount, Member } from "@/entities/auth/api/auth"
export { MOCK_MEMBERS, SIGNUP_TERMS } from "@/entities/auth/api/auth"

export type { RuleCheck } from "@/entities/auth/lib/auth-rules"
export {
  evaluateIdRules,
  isIdValid,
  evaluatePasswordRules,
  isPasswordValid,
} from "@/entities/auth/lib/auth-rules"

export { OtpModal } from "@/entities/auth/ui/otp-modal"
export { IssueOtpRequestTransactionType as OtpTransactionType } from "@/shared/api/generated"
export { SessionExpiredModal } from "@/entities/auth/ui/session-expired-modal"

export {
  useSignupTermsQuery,
  useCheckSignupTermsMutation,
  useVerifySignupAccountMutation,
  useCheckSignupUserIdMutation,
  useIssueSignupEmailVerificationMutation,
  useVerifySignupEmailMutation,
  useValidateSignupMutation,
  useSignupConfirmationQuery,
  useCompleteSignupMutation,
} from "@/entities/auth/api/signup"
