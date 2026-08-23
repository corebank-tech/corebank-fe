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

/** POL-021: 조회화면 기본 조회기간 1개월(REQ-INQR-009·TRSF-021·RSV-014·AUTO-018). */
export const QUERY_DEFAULT_PERIOD_MONTHS = 1

/**
 * POL-022: 목록 페이징 건수 선택지. 규정은 `5·10·20·30·50·전체` 6종이고,
 * 여기 담는 것은 숫자 5종이다 — "전체"는 값이 아니라 별도 선택지라
 * GridToolbar가 `showAllOption`으로 따로 렌더한다.
 */
export const QUERY_PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50] as const

/**
 * POL-022: 목록 페이징 기본 건수 10건(REQ-CMN-019).
 *
 * 서버 페이징 화면 5개(B-03·E-04·E-05·G-04·G-05)가 이 상수를 본다 — 그쪽은
 * 기본 건수가 그대로 서버에 나가는 `size`라 값이 갈리면 조회가 어긋난다.
 * 클라이언트 페이징인 D-04·F-02는 아직 리터럴 10을 들고 있다. 서버로 나가는
 * 값이 아니라 급하지 않아 후속으로 미뤘다(#59 리뷰 R2).
 *
 * 타입으로 선택지 포함을 강제한다 — 선택지에 없는 값이 기본값이 되면 `<Select>`가
 * 매칭되는 `<option>`을 못 찾아 첫 항목을 표시하고, 화면에 보이는 건수와 실제
 * 요청 `size`가 조용히 어긋난다.
 */
export const QUERY_DEFAULT_PAGE_SIZE: (typeof QUERY_PAGE_SIZE_OPTIONS)[number] = 10

/** POL-026: 이메일 인증번호 유효시간 180초 / 숫자 6자리. */
export const EMAIL_CODE_TTL_SECONDS = 180

/** POL-035: 자동이체 시작일 D+1 ~ D+365(종료일은 시작일로부터 최대 60개월). */
export const AUTO_TRANSFER_START_MAX_RANGE_DAYS = 365
