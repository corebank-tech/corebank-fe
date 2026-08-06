/**
 * `docs/requirements.md` §2 정책정의(POL)의 수치 단일 출처.
 * 화면·컴포넌트는 이 상수만 참조하고 값을 직접 다시 적지 않는다.
 * 같은 값이라도 서로 다른 POL 규칙이면 별도 상수로 유지한다 —
 * 우연히 값이 같을 뿐 한쪽이 바뀌어도 다른 쪽은 바뀌지 않아야 하는 별개 규칙이기 때문이다.
 */

/** POL-001: 세션 타임아웃 10분(600초). POL-002: 연장 시에도 동일하게 재설정된다. */
export const SESSION_TIMEOUT_SECONDS = 600

/** POL-003: 로그인 연속 5회 실패 시 계정 잠금. */
export const LOGIN_MAX_ATTEMPTS = 5

/** POL-005: 계좌비밀번호 연속 5회 실패 시 거래정지. */
export const ACCOUNT_PASSWORD_ERROR_LIMIT = 5

/** POL-006: OTP 유효시간 180초(3분). */
export const OTP_TTL_SECONDS = 180

/** POL-007: OTP 연속 5회 오류 시 거래요청 무효화. */
export const OTP_MAX_ATTEMPTS = 5

/** POL-013: 1회 이체한도 기본값. */
export const TRANSFER_LIMIT_PER_TRANSFER_DEFAULT = 1_000_000

/** POL-014: 1일 이체한도 기본값. */
export const TRANSFER_LIMIT_PER_DAY_DEFAULT = 5_000_000

/** POL-015: 1회 이체한도 최대값(고객 변경 가능 상한). */
export const TRANSFER_LIMIT_PER_TRANSFER_MAX = 50_000_000

/** POL-016: 1일 이체한도 최대값(고객 변경 가능 상한). */
export const TRANSFER_LIMIT_PER_DAY_MAX = 100_000_000

/** POL-018: 예약이체 등록 가능 범위 D+1 ~ D+365. */
export const RESERVATION_MAX_RANGE_DAYS = 365

/** POL-021: 거래내역 조회 가능 기간 최대 1년. */
export const QUERY_MAX_RANGE_DAYS = 365

/** POL-026: 이메일 인증번호 유효시간 180초 / 숫자 6자리. */
export const EMAIL_CODE_TTL_SECONDS = 180

/** POL-035: 자동이체 시작일 D+1 ~ D+365(종료일은 시작일로부터 최대 60개월). */
export const AUTO_TRANSFER_START_MAX_RANGE_DAYS = 365
