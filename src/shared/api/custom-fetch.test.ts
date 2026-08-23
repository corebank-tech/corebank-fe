import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import { http, HttpResponse } from "msw"
import { server } from "@/mocks/server"
import { customFetch, withIdempotencyKey } from "@/shared/api/custom-fetch"
import { isApiError } from "@/shared/api/api-error"
import { onSessionExpired } from "@/shared/api/session-events"

beforeAll(() => {
  vi.stubEnv("VITE_API_BASE_URL", "")
  server.listen({ onUnhandledRequest: "error" })
})
afterEach(() => server.resetHandlers())
afterAll(() => {
  server.close()
  vi.unstubAllEnvs()
})

describe("customFetch 봉투 해제 (REQ-CMN-007)", () => {
  it("성공 응답의 data 만 반환한다", async () => {
    server.use(
      http.get("*/api/ping", () =>
        HttpResponse.json({
          code: "0000",
          message: "ok",
          data: { pong: true },
        }),
      ),
    )
    const result = await customFetch<{ pong: boolean }>("/api/ping")
    expect(result).toEqual({ pong: true })
  })

  it("업무오류 code 를 서버 메시지 그대로 실어 ApiError 를 던진다 (REQ-CMN-008)", async () => {
    server.use(
      http.get("*/api/ping", () =>
        HttpResponse.json(
          {
            code: "ACCT0001",
            message: "존재하지 않는 계좌입니다.",
            data: null,
          },
          { status: 404 },
        ),
      ),
    )
    await expect(customFetch("/api/ping")).rejects.toSatisfy(
      (error: unknown) => {
        if (!isApiError(error)) return false
        return (
          error.code === "ACCT0001" &&
          error.message === "존재하지 않는 계좌입니다."
        )
      },
    )
  })
})

describe("Idempotency-Key (REQ-CMN-014)", () => {
  it("GET 요청에는 멱등키를 붙이지 않는다", async () => {
    let receivedKey: string | null = null
    server.use(
      http.get("*/api/ping", ({ request }) => {
        receivedKey = request.headers.get("Idempotency-Key")
        return HttpResponse.json({ code: "0000", message: "ok", data: null })
      }),
    )
    await customFetch("/api/ping")
    expect(receivedKey).toBeNull()
  })

  it("비-GET 요청에는 멱등키를 자동으로 붙인다", async () => {
    let receivedKey: string | null = null
    server.use(
      http.post("*/api/transfers", ({ request }) => {
        receivedKey = request.headers.get("Idempotency-Key")
        return HttpResponse.json({ code: "0000", message: "ok", data: null })
      }),
    )
    await customFetch("/api/transfers", { method: "POST" })
    expect(receivedKey).toEqual(expect.any(String))
  })

  it("호출자가 이미 지정한 멱등키를 존중한다 (재시도 시 동일 키 유지)", async () => {
    let receivedKey: string | null = null
    server.use(
      http.post("*/api/transfers", ({ request }) => {
        receivedKey = request.headers.get("Idempotency-Key")
        return HttpResponse.json({ code: "0000", message: "ok", data: null })
      }),
    )
    const fixedKey = "fixed-retry-key"
    await customFetch(
      "/api/transfers",
      withIdempotencyKey({ method: "POST" }, fixedKey),
    )
    expect(receivedKey).toBe(fixedKey)
  })

  it("generated 래퍼가 옵션 헤더를 펼쳐도 지정한 멱등키를 유지한다", async () => {
    let receivedKey: string | null = null

    server.use(
      http.post("*/api/transfers", ({ request }) => {
        receivedKey = request.headers.get("Idempotency-Key")
        return HttpResponse.json({
          code: "0000",
          message: "ok",
          data: null,
        })
      }),
    )

    const fixedKey = "fixed-generated-retry-key"
    const options = withIdempotencyKey({}, fixedKey)

    await customFetch("/api/transfers", {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    expect(receivedKey).toBe(fixedKey)
  })
})

describe("세션 만료 (POL-001)", () => {
  /** 401 을 응답하는 핸들러를 걸고, 그 요청이 만료 신호를 냈는지 센다. */
  const countExpiredSignals = async (body: {
    code: string
    message: string
  }): Promise<number> => {
    server.use(
      http.get("*/api/ping", () =>
        HttpResponse.json({ ...body, data: null }, { status: 401 }),
      ),
    )
    const listener = vi.fn()
    const unsubscribe = onSessionExpired(listener)

    await expect(customFetch("/api/ping")).rejects.toBeDefined()
    unsubscribe()

    return listener.mock.calls.length
  }

  it("CMN0101 을 받으면 onSessionExpired 리스너에 알린다", async () => {
    const calls = await countExpiredSignals({
      code: "CMN0101",
      message: "세션이 만료되었습니다.",
    })
    expect(calls).toBe(1)
  })

  // 로그인 실패도 401 이다. 상태코드로 판정하면 A-01 의 실패가 A-11 모달을 띄운다.
  it("로그인 실패(ATH0101)는 401 이어도 만료로 보지 않는다", async () => {
    const calls = await countExpiredSignals({
      code: "ATH0101",
      message: "아이디 또는 비밀번호가 올바르지 않습니다.",
    })
    expect(calls).toBe(0)
  })

  it("code 를 모르는 401 은 만료로 보지 않는다", async () => {
    const calls = await countExpiredSignals({
      code: "ATH9999",
      message: "알 수 없는 인증 오류입니다.",
    })
    expect(calls).toBe(0)
  })

  it("봉투 없는 401(JSON 아님)도 만료로 보지 않는다", async () => {
    server.use(
      http.get("*/api/ping", () => new HttpResponse("", { status: 401 })),
    )
    const listener = vi.fn()
    const unsubscribe = onSessionExpired(listener)

    await expect(customFetch("/api/ping")).rejects.toBeDefined()
    expect(listener).not.toHaveBeenCalled()

    unsubscribe()
  })
})

describe("요청 취소 신호", () => {
  it("호출자가 signal 을 넘겨도 타임아웃 상한이 함께 걸린다", async () => {
    server.use(
      http.get("*/api/ping", () =>
        HttpResponse.json({ code: "0000", message: "ok", data: null }),
      ),
    )
    const controller = new AbortController()
    let sentSignal: AbortSignal | undefined
    const originalFetch = globalThis.fetch
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      sentSignal = init?.signal ?? undefined
      return originalFetch(input, init)
    })

    await customFetch("/api/ping", { signal: controller.signal })

    // 호출자 신호를 그대로 넘기면 타임아웃이 사라진다. 합성 신호여야 한다.
    expect(sentSignal).toBeDefined()
    expect(sentSignal).not.toBe(controller.signal)
    vi.restoreAllMocks()
  })

  it("호출자가 취소하면 요청이 중단된다", async () => {
    server.use(
      http.get("*/api/ping", () =>
        HttpResponse.json({ code: "0000", message: "ok", data: null }),
      ),
    )
    const controller = new AbortController()
    controller.abort()

    await expect(
      customFetch("/api/ping", { signal: controller.signal }),
    ).rejects.toSatisfy((error: unknown) => isApiError(error))
  })
})
