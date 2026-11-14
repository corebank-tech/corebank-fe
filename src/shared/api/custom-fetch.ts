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
import { createCorrelationId } from "@/shared/api/correlation-id"

/** 공백과 보이지 않는 문자를 거른다. */
const PRINTABLE_ASCII_ONLY = /^[\x21-\x7E]*$/

/**
 * 환경변수가 깨진 채로 빌드돼도 빌드는 통과한다. 값이 없으면 `undefined/auth/login` 으로,
 * 보이지 않는 문자가 섞이면 `/api/v1%20│/customers/me` 로 요청이 나간다 — 부팅 때 막는다.
 */
const resolveApiBaseUrl = (): string => {
  const rawBaseUrl = import.meta.env.VITE_API_BASE_URL
  if (typeof rawBaseUrl !== "string" || rawBaseUrl === "") {
    throw new Error(
      "VITE_API_BASE_URL 이 설정되지 않았습니다. 배포 환경변수를 확인하세요.",
    )
  }
  if (!PRINTABLE_ASCII_ONLY.test(rawBaseUrl)) {
    throw new Error(
      `VITE_API_BASE_URL 에 공백이나 보이지 않는 문자가 섞여 있습니다: ${JSON.stringify(rawBaseUrl)}`,
    )
  }
  return rawBaseUrl
}

const API_BASE_URL = resolveApiBaseUrl()
const REQUEST_TIMEOUT_MS = 30_000
/**
 * 첨부 업로드 제한 시간. 서버는 요청 하나에 40MB까지 받는데, 30초로는 약 8Mbps 보다 느린
 * 회선에서 30MB 첨부가 매번 끊긴다. 5분이면 약 1Mbps 회선까지 버틴다.
 */
export const UPLOAD_TIMEOUT_MS = 5 * 60_000
const SESSION_EXPIRED_STATUS = 401
const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key"
const CONTENT_TYPE_HEADER = "Content-Type"
const JSON_CONTENT_TYPE = "application/json"
const CSRF_COOKIE_NAME = "XSRF-TOKEN"
const CSRF_HEADER = "X-XSRF-TOKEN"
const CORRELATION_ID_HEADER = "X-Correlation-Id"
/** REQ-CMN-014: 상태를 바꾸지 않는 메서드만 멱등키를 생략한다. */
const READ_ONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

const buildRequestUrl = (url: string): string =>
  url.startsWith("http") ? url : `${API_BASE_URL}${url}`

/**
 * `customFetch` 가 받는 요청 설정. orval 이 `Parameters<typeof customFetch>[1]` 로 생성 훅의
 * `request` 옵션 타입을 만들므로, 여기 더한 항목은 생성 훅에서도 그대로 넘길 수 있다.
 */
export type CustomFetchOptions = RequestInit & {
  /**
   * 사람이 조작하지 않아도 나가는 요청(폴링). 유휴 타이머의 활동으로 세지 않는다.
   * 세면 화면을 열어 둔 것만으로 자동 로그아웃(POL-001, POL-A01)이 영영 오지 않는다.
   */
  background?: boolean
  /** 기본 제한 시간(30초) 대신 쓸 값. 큰 첨부 업로드에 `UPLOAD_TIMEOUT_MS` 를 넘긴다 */
  timeoutMs?: number
}

/**
 * orval 생성 훅이 넘기는 취소 신호와 자체 타임아웃을 함께 건다.
 * 둘 중 하나라도 중단되면 요청이 끊기므로, 호출자가 신호를 넘겨도
 * 제한 시간 상한이 유지된다.
 */
const buildAbortSignal = (
  signal: RequestInit["signal"],
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): AbortSignal => {
  const timeoutSignal = AbortSignal.timeout(timeoutMs)
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
  // 조회도 추적 대상이라 메서드를 가리지 않는다. 호출자 지정값을 받지 않는 이유는
  // 검증을 건너뛴 값이 서버에서 교체되면 화면의 id 와 서버 로그의 id 가 갈리기 때문이다.
  headers.set(CORRELATION_ID_HEADER, createCorrelationId())
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
  { background = false, timeoutMs, ...options }: CustomFetchOptions = {},
): Promise<TData> => {
  const method = (options.method ?? "GET").toUpperCase()

  let response: Response
  try {
    response = await fetch(buildRequestUrl(url), {
      ...options,
      method,
      credentials: "include", // POL-001: 서버 세션 쿠키
      headers: buildHeaders(method, options),
      signal: buildAbortSignal(options.signal, timeoutMs),
    })
  } catch (cause) {
    throw new ApiError({
      code: NETWORK_ERROR_CODE,
      message: NETWORK_ERROR_MESSAGE,
      status: NETWORK_ERROR_STATUS,
      cause,
    })
  }

  if (!background) emitApiActivity()

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
  options: CustomFetchOptions = {},
  key: string = crypto.randomUUID(),
): CustomFetchOptions => {
  const headers = new Headers(options.headers)
  headers.set(IDEMPOTENCY_KEY_HEADER, key)

  const plainHeaders: Record<string, string> = {}
  headers.forEach((value, name) => {
    plainHeaders[name] = value
  })

  return { ...options, headers: plainHeaders }
}

/**
 * 공통 봉투 없이 파일 바이트를 주는 조회(첨부 서류 내용 등). 성공이면 `Blob` 을 돌려주고,
 * 실패는 서버가 봉투로 준 오류를 `customFetch` 와 같은 `ApiError` 로 바꾼다.
 */
export const fetchBinary = async (
  url: string,
  options: RequestInit = {},
): Promise<Blob> => {
  let response: Response
  try {
    response = await fetch(buildRequestUrl(url), {
      ...options,
      method: "GET",
      credentials: "include",
      headers: buildHeaders("GET", options),
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

  if (response.ok) return response.blob()

  const envelope = await readEnvelope<unknown>(response)
  if (
    response.status === SESSION_EXPIRED_STATUS &&
    envelope?.code === SESSION_EXPIRED_CODE
  ) {
    emitSessionExpired()
  }
  throw new ApiError({
    code: envelope?.code ?? NETWORK_ERROR_CODE,
    message: envelope?.message ?? NETWORK_ERROR_MESSAGE,
    status: response.status,
    data: envelope?.data,
  })
}
