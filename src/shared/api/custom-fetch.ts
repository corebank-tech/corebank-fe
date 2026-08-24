import {
  ApiError,
  NETWORK_ERROR_CODE,
  NETWORK_ERROR_MESSAGE,
  NETWORK_ERROR_STATUS,
  SESSION_EXPIRED_CODE,
  SUCCESS_CODE,
  type ApiEnvelope,
} from "@/shared/api/api-error"
import {
  emitApiActivity,
  emitSessionExpired,
} from "@/shared/api/session-events"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const REQUEST_TIMEOUT_MS = 30_000
const SESSION_EXPIRED_STATUS = 401
const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key"
const CONTENT_TYPE_HEADER = "Content-Type"
const JSON_CONTENT_TYPE = "application/json"
const CSRF_COOKIE_NAME = "XSRF-TOKEN"
const CSRF_HEADER = "X-XSRF-TOKEN"
/** REQ-CMN-014: 상태를 바꾸지 않는 메서드만 멱등키를 생략한다. */
const READ_ONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

const buildRequestUrl = (url: string): string =>
  url.startsWith("http") ? url : `${API_BASE_URL}${url}`

/**
 * orval 생성 훅이 넘기는 취소 신호와 자체 타임아웃을 함께 건다.
 * 둘 중 하나라도 중단되면 요청이 끊기므로, 호출자가 신호를 넘겨도
 * REQUEST_TIMEOUT_MS 상한이 유지된다.
 */
const buildAbortSignal = (signal: RequestInit["signal"]): AbortSignal => {
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  if (!signal) return timeoutSignal
  return AbortSignal.any([signal, timeoutSignal])
}

/** 서버가 로그인 시 내려주는 XSRF-TOKEN 쿠키 값을 읽는다(CookieCsrfTokenRepository, httpOnly=false). */
const readCsrfCookie = (): string | undefined => {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`))
  return match?.split("=")[1]
}

const buildHeaders = (method: string, init: RequestInit): Headers => {
  const headers = new Headers(init.headers)

  if (init.body !== undefined && !(init.body instanceof FormData)) {
    if (!headers.has(CONTENT_TYPE_HEADER)) {
      headers.set(CONTENT_TYPE_HEADER, JSON_CONTENT_TYPE)
    }
  }
  // 호출자가 이미 키를 넣었다면 존중한다 — 재시도 시 같은 키를 써야 하기 때문이다.
  if (!READ_ONLY_METHODS.has(method) && !headers.has(IDEMPOTENCY_KEY_HEADER)) {
    headers.set(IDEMPOTENCY_KEY_HEADER, crypto.randomUUID())
  }
  // 상태변경 요청은 CookieCsrfTokenRepository가 요구하는 CSRF 헤더가 없으면 403(CMN0102)으로 거부된다.
  if (!READ_ONLY_METHODS.has(method) && !headers.has(CSRF_HEADER)) {
    const csrfToken = readCsrfCookie()
    if (csrfToken) headers.set(CSRF_HEADER, csrfToken)
  }
  return headers
}

const readEnvelope = async <TData>(
  response: Response,
): Promise<ApiEnvelope<TData> | null> => {
  const contentType = response.headers.get(CONTENT_TYPE_HEADER) ?? ""
  if (!contentType.includes(JSON_CONTENT_TYPE)) return null
  return (await response.json()) as ApiEnvelope<TData>
}

/**
 * REQ-CMN-007 공통 봉투를 벗겨 data 만 돌려준다.
 * 시그니처는 orval `override.mutator` 규약(url, RequestInit)에 맞춘다.
 */
export const customFetch = async <TData>(
  url: string,
  options: RequestInit = {},
): Promise<TData> => {
  const method = (options.method ?? "GET").toUpperCase()

  let response: Response
  try {
    response = await fetch(buildRequestUrl(url), {
      ...options,
      method,
      credentials: "include", // POL-001: 서버 세션 쿠키
      headers: buildHeaders(method, options),
      signal: buildAbortSignal(options.signal),
    })
  } catch (cause) {
    throw new ApiError({
      code: NETWORK_ERROR_CODE,
      message: NETWORK_ERROR_MESSAGE,
      status: NETWORK_ERROR_STATUS,
      cause,
    })
  }

  emitApiActivity()

  const envelope = await readEnvelope<TData>(response)

  if (response.status === SESSION_EXPIRED_STATUS) {
    // 401 을 쓰는 실패가 세션 만료만은 아니다 — 로그인 실패도 401(ATH0101)이라
    // 상태코드로 판정하면 A-01 의 실패가 A-11 세션만료 모달을 띄운다.
    if (envelope?.code === SESSION_EXPIRED_CODE) emitSessionExpired()
    throw new ApiError({
      code: envelope?.code ?? NETWORK_ERROR_CODE,
      message: envelope?.message ?? NETWORK_ERROR_MESSAGE,
      status: response.status,
      data: envelope?.data,
    })
  }

  if (!envelope) {
    throw new ApiError({
      code: NETWORK_ERROR_CODE,
      message: NETWORK_ERROR_MESSAGE,
      status: response.status,
    })
  }

  if (!response.ok || envelope.code !== SUCCESS_CODE) {
    throw new ApiError({
      code: envelope.code,
      message: envelope.message,
      status: response.status,
      data: envelope.data,
    })
  }

  return envelope.data
}

/** 재시도해도 같은 거래로 취급되도록 멱등키를 고정한다 (REQ-CMN-014). */
export const withIdempotencyKey = (
  options: RequestInit = {},
  key: string = crypto.randomUUID(),
): RequestInit => {
  const headers = new Headers(options.headers)
  headers.set(IDEMPOTENCY_KEY_HEADER, key)

  const plainHeaders: Record<string, string> = {}
  headers.forEach((value, name) => {
    plainHeaders[name] = value
  })

  return { ...options, headers: plainHeaders }
}
