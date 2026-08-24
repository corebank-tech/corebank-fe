export type ApiEnvelope<TData> = {
  code: string
  message: string
  data: TData
}

/** REQ-CMN-007: 정상 처리 코드. */
export const SUCCESS_CODE = "0000"

/**
 * REQ-CMN-008: 오류 메시지는 서버 단일 소스다.
 * 아래 두 상수는 서버 응답이 아예 없을 때(전송 실패)만 쓰는 유일한 예외이며,
 * 화면이 아니라 이 모듈 한 곳에서만 정의한다.
 */
/**
 * REQ-CMN-006: 인증정보가 없거나 서버 세션이 만료됐을 때의 코드.
 * 401 이라고 모두 세션 만료가 아니다 — 로그인 실패도 401(`ATH0101`)이라,
 * 상태코드가 아니라 이 코드로만 만료를 판정한다.
 */
export const SESSION_EXPIRED_CODE = "CMN0101"

export const NETWORK_ERROR_CODE = "CMN9000"
export const NETWORK_ERROR_MESSAGE =
  "네트워크 연결을 확인한 뒤 다시 시도하세요."
export const NETWORK_ERROR_STATUS = 0

type ApiErrorInit = {
  code: string
  message: string
  status: number
  data?: unknown
  cause?: unknown
}

/**
 * 서버가 준 code/message 를 그대로 실어 나른다. 화면은 error.message 를 출력하고
 * 분기가 필요할 때만 error.code 를 본다. 클래스인 이유는 stack 보존과
 * TanStack Query 에서의 instanceof 판정 때문이다.
 */
export class ApiError extends Error {
  readonly code: string
  readonly status: number
  readonly data?: unknown

  constructor({ code, message, status, data, cause }: ApiErrorInit) {
    super(message, { cause })
    this.name = "ApiError"
    this.code = code
    this.status = status
    this.data = data
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError

/**
 * REQ-CMN-008: 화면에 보여줄 오류 문구는 서버가 준 message 다. 화면이 code 별
 * 문구표를 만들지 않는다. customFetch 가 전송 실패까지 ApiError 로 바꿔 던지므로
 * 폴백은 그 경로를 벗어난 경우에만 쓰인다.
 *
 * 세션 만료만 예외다. A-11 모달이 화면을 덮고 재로그인을 요구하므로
 * (customFetch 가 CMN0101 에서 emitSessionExpired 를 쏜다) 같은 문구를 조회
 * 결과 자리에 또 적으면 모달 뒤에 읽히지 않는 문장이 남는다.
 */
export const toErrorMessage = (error: unknown): string => {
  if (!isApiError(error)) return NETWORK_ERROR_MESSAGE
  if (error.code === SESSION_EXPIRED_CODE) return ""
  return error.message
}
