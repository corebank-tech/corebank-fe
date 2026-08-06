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
export const NETWORK_ERROR_CODE = "CMN9000"
export const NETWORK_ERROR_MESSAGE =
  "네트워크 연결을 확인한 뒤 다시 시도하세요."
export const NETWORK_ERROR_STATUS = 0

type ApiErrorInit = {
  code: string
  message: string
  status: number
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

  constructor({ code, message, status, cause }: ApiErrorInit) {
    super(message, { cause })
    this.name = "ApiError"
    this.code = code
    this.status = status
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError
