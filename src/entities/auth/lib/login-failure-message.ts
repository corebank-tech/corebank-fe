import {
  resolveLoginFailure,
  type LoginFailureReason,
} from "@/entities/auth/api/login"
import { isApiError } from "@/shared/api/api-error"
import { LOGIN_MAX_ATTEMPTS as MAX_ATTEMPTS } from "@/shared/config/policy"

const FAILURE_MESSAGE: Record<
  Exclude<LoginFailureReason, "UNKNOWN">,
  string
> = {
  MISMATCH: "아이디 또는 비밀번호가 올바르지 않습니다.",
  LOCKED: `비밀번호를 ${MAX_ATTEMPTS}회 연속 잘못 입력해 계정이 잠겼습니다. 잠금 해제는 고객센터를 통한 관리자 확인 후에만 가능합니다.`,
}

/**
 * 아이디·비밀번호 불일치 문구. 관리자 로그인이 권한 없는 계정을 거절할 때도 이
 * 문구를 쓴다 — 따로 쓰면 "자격증명은 맞았다"가 드러나 REQ-AUTH-023 의 취지에서
 * 벗어난다.
 */
export const LOGIN_MISMATCH_MESSAGE = FAILURE_MESSAGE.MISMATCH

/**
 * 로그인 실패를 사용자에게 보일 문구로 바꾼다.
 *
 * 고객 로그인(A-01)과 관리자 로그인이 같은 엔드포인트를 쓰므로 문구도 한 곳에서
 * 만든다 — 화면마다 따로 쓰면 같은 오류코드에 다른 문장이 나간다.
 *
 * 아이디·비밀번호와 무관한 실패(전송 실패·CSRF)만 서버 메시지를 그대로 보여준다.
 * REQ-AUTH-023 때문에 계정 존재 여부가 드러나는 문구를 여기서 만들지 않는다.
 */
export const resolveLoginFailureMessage = (error: unknown): string => {
  const reason = resolveLoginFailure(error)
  if (reason !== "UNKNOWN") return FAILURE_MESSAGE[reason]

  return isApiError(error)
    ? error.message
    : "로그인 처리 중 오류가 발생했습니다."
}
