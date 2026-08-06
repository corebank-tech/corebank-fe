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
})

describe("세션 만료 (POL-001)", () => {
  it("401 응답 시 onSessionExpired 리스너에 알린다", async () => {
    server.use(
      http.get("*/api/ping", () =>
        HttpResponse.json(
          { code: "AUTH4010", message: "세션이 만료되었습니다.", data: null },
          { status: 401 },
        ),
      ),
    )
    const listener = vi.fn()
    const unsubscribe = onSessionExpired(listener)

    await expect(customFetch("/api/ping")).rejects.toBeDefined()
    expect(listener).toHaveBeenCalledOnce()

    unsubscribe()
  })
})
