export type { VerifyAccount, Member } from "@/entities/auth/api/auth"
export { MOCK_MEMBERS, SIGNUP_TERMS } from "@/entities/auth/api/auth"

export type { RuleCheck } from "@/entities/auth/lib/auth-rules"
export {
  evaluateIdRules,
  isIdValid,
  evaluatePasswordRules,
  isPasswordValid,
} from "@/entities/auth/lib/auth-rules"

export type {
  LoginFailureReason,
  LoginRequest,
} from "@/entities/auth/api/login"
export {
  resolveLoginFailure,
  resolveRemainingAttempts,
  useLoginMutation,
} from "@/entities/auth/api/login"
export { logout } from "@/entities/auth/api/logout"

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
export {
  hasAnyWritePermission,
  hasPermission,
  readSessionAuthority,
  type SessionAuthority,
  type SessionRole,
} from "@/entities/auth/lib/session-role"
export { ADMIN_PERMISSION_LABELS } from "@/entities/auth/lib/permission-label"
/**
 * 권한 타입은 `shared/types` 가 원본이지만(네비 설정이 shared 라 그쪽에 둬야 한다)
 * 소비자가 출처를 둘로 나눠 기억하지 않도록 여기서도 내보낸다.
 *
 * 원본 경로를 직접 쓰는 곳은 둘뿐이다 — `shared/config/admin-nav.ts`(shared 는
 * `entities` 를 import 할 수 없다)와 `lib/session-role.ts`(같은 슬라이스의 공개
 * API 를 자기가 다시 import 하면 순환이 된다). 그 밖의 소비자는 이 경로를 쓴다.
 */
export type { AdminPermission } from "@/shared/types/admin-permission"
export {
  LOGIN_MISMATCH_MESSAGE,
  resolveLoginFailureMessage,
} from "@/entities/auth/lib/login-failure-message"
