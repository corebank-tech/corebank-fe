import { useMutation } from "@tanstack/react-query"
import { login, type LoginRequest } from "@/shared/api/generated"
import { isApiError } from "@/shared/api/api-error"

/**
 * 서버가 로그인 실패에 쓰는 코드(POST /auth/login 의 401·403).
 * 화면은 이 코드를 직접 보지 않고 아래 LoginFailureReason 만 본다 —
 * 서버가 코드를 늘려도 화면 분기가 조용히 새 값을 흘리지 않게 하기 위해서다.
 */
const MISMATCH_CODE = "ATH0101"
const LOCKED_CODE = "ATH0102"

/**
 * UNKNOWN 은 폴백이 아니라 표시 대상이다. CSRF 실패(CMN0102)·전송 실패(CMN9000)처럼
 * 아이디·비밀번호와 무관한 실패가 "비밀번호가 틀렸다"로 둔갑하지 않도록 분리한다.
 */
export type LoginFailureReason = "MISMATCH" | "LOCKED" | "UNKNOWN"

export const resolveLoginFailure = (error: unknown): LoginFailureReason => {
  if (!isApiError(error)) return "UNKNOWN"
  if (error.code === MISMATCH_CODE) return "MISMATCH"
  if (error.code === LOCKED_CODE) return "LOCKED"
  return "UNKNOWN"
}

/** A-01 로그인(REQ-AUTH-024). 성공 시 서버가 JSESSIONID·XSRF-TOKEN 쿠키를 발급한다. */
export const useLoginMutation = () =>
  useMutation({
    mutationFn: (request: LoginRequest) => login(request),
  })

export type { LoginRequest }
