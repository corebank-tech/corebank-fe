import * as React from "react"
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "@/mocks/server"
import { SESSION_TIMEOUT_SECONDS } from "@/shared/config/policy"
import { SessionProvider } from "@/features/session/model/session-provider"
import { useSession } from "@/features/session/model/use-session"

/** 이 테스트는 모킹 대신 실제 customFetch·쿼리 경로를 태운다. */
let hasServerSession = false
let logoutCallCount = 0
let profileCallCount = 0

const respondUnauthorized = () =>
  HttpResponse.json(
    { code: "CMN0101", message: "인증정보가 없거나 세션이 만료되었습니다." },
    { status: 401 },
  )

/** 서버 세션 유무에 따라 응답이 갈리는 최소 페이크. 로그아웃하면 세션이 사라진다. */
const serverHandlers = [
  http.get("*/customers/me", () => {
    profileCallCount += 1
    return hasServerSession
      ? HttpResponse.json({
          code: "0000",
          message: "성공",
          data: { customerId: 1, userName: "홍*동" },
        })
      : respondUnauthorized()
  }),
  // 세션이 없으면 401 CMN0101 을 주면서도 쿠키는 지운다(실측).
  http.post("*/auth/logout", () => {
    logoutCallCount += 1
    hasServerSession = false
    return respondUnauthorized()
  }),
]

beforeAll(() => {
  vi.stubEnv("VITE_API_BASE_URL", "")
  server.listen({ onUnhandledRequest: "error" })
})

beforeEach(() => {
  logoutCallCount = 0
  profileCallCount = 0
  hasServerSession = false
  server.use(...serverHandlers)
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
  vi.unstubAllEnvs()
})

const renderSession = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return renderHook(() => useSession(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <SessionProvider>{children}</SessionProvider>
      </QueryClientProvider>
    ),
  })
}

/** 부트스트랩이 끝날 때까지 기다린다. */
const renderSettledSession = async () => {
  const rendered = renderSession()
  await waitFor(() =>
    expect(rendered.result.current.isBootstrapping).toBe(false),
  )
  return rendered
}

describe("세션 부트스트랩", () => {
  it("서버 세션이 살아 있으면 새로고침 후에도 로그인 상태를 복원한다", async () => {
    hasServerSession = true
    const { result } = await renderSettledSession()

    expect(result.current.isAuthenticated).toBe(true)
    // 헤더 이름은 마스킹된 서버 값을 그대로 쓴다.
    expect(result.current.customerName).toBe("홍*동")
  })

  it("서버 세션이 없으면 비로그인으로 확정한다", async () => {
    const { result } = await renderSettledSession()

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.customerName).toBe("")
  })

  // 로그인한 적 없는 사용자가 받는 부트스트랩 401 이 A-11 안내를 띄우면 안 된다.
  it("부트스트랩 401 은 세션만료 안내로 이어지지 않는다", async () => {
    const { result } = await renderSettledSession()

    expect(result.current.expiredReason).toBeNull()
    expect(logoutCallCount).toBe(0)
  })
})

describe("세션 만료", () => {
  it("무조작 타이머가 끝나면 서버 세션까지 끊는다", async () => {
    hasServerSession = true
    const { result } = await renderSettledSession()

    await act(async () => {
      vi.advanceTimersByTime(SESSION_TIMEOUT_SECONDS * 1000)
    })

    await waitFor(() => expect(result.current.expiredReason).toBe("timer"))
    // 서버 세션은 아직 살아 있으므로 우리가 끊어야 한다.
    await waitFor(() => expect(logoutCallCount).toBe(1))
    expect(result.current.isAuthenticated).toBe(false)
  })

  it("서버가 세션을 끝냈으면 로그아웃을 부르지 않는다", async () => {
    hasServerSession = true
    const { result } = await renderSettledSession()

    // 서버가 세션을 끝낸 뒤 임의의 요청이 401 CMN0101 을 받은 상황.
    hasServerSession = false
    await act(async () => {
      await result.current.setSession().catch(() => undefined)
    })

    await waitFor(() => expect(result.current.expiredReason).toBe("server"))
    expect(logoutCallCount).toBe(0)
  })

  it("안내를 확인하면 안내만 닫고 세션을 다시 정리하지 않는다", async () => {
    hasServerSession = true
    const { result } = await renderSettledSession()
    hasServerSession = false
    await act(async () => {
      await result.current.setSession().catch(() => undefined)
    })
    await waitFor(() => expect(result.current.expiredReason).toBe("server"))

    act(() => result.current.acknowledgeExpired())

    expect(result.current.expiredReason).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(logoutCallCount).toBe(0)
  })
})

describe("세션 연장 (REQ-AUTH-030)", () => {
  it("[연장]은 서버에 요청을 보내 서버 세션까지 갱신한다", async () => {
    hasServerSession = true
    const { result } = await renderSettledSession()
    const before = profileCallCount

    act(() => result.current.extend())

    // 지역 타이머만 되돌리면 화면은 10:00 인데 서버는 계속 만료를 향해 간다.
    await waitFor(() => expect(profileCallCount).toBe(before + 1))
  })

  it("연장 요청의 응답이 잔여시간을 되돌린다", async () => {
    hasServerSession = true
    const { result } = await renderSettledSession()

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    await waitFor(() =>
      expect(result.current.remainingSeconds).toBeLessThan(
        SESSION_TIMEOUT_SECONDS,
      ),
    )

    act(() => result.current.extend())

    await waitFor(() =>
      expect(result.current.remainingSeconds).toBe(SESSION_TIMEOUT_SECONDS),
    )
  })
})

describe("로그인 직후 세션 세우기", () => {
  it("고객정보 조회가 성공하면 true 를 돌려준다", async () => {
    const { result } = await renderSettledSession()
    hasServerSession = true

    let restored: boolean | undefined
    await act(async () => {
      restored = await result.current.setSession()
    })

    expect(restored).toBe(true)
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))
  })

  // 서버 세션은 생겼는데 고객정보를 못 읽은 상태. 호출자가 안내를 세울 수 있어야 한다.
  it("고객정보 조회가 실패하면 false 를 돌려준다", async () => {
    const { result } = await renderSettledSession()
    hasServerSession = false

    let restored: boolean | undefined
    await act(async () => {
      restored = await result.current.setSession()
    })

    expect(restored).toBe(false)
    expect(result.current.isAuthenticated).toBe(false)
  })
})

describe("로그아웃", () => {
  it("서버가 401 을 줘도 클라이언트 상태를 정리한다", async () => {
    hasServerSession = true
    const { result } = await renderSettledSession()

    await act(async () => {
      await result.current.logout()
    })

    expect(logoutCallCount).toBe(1)
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.customerName).toBe("")
  })

  it("로그아웃 호출이 받은 401 은 A-11 안내로 이어지지 않는다", async () => {
    hasServerSession = true
    const { result } = await renderSettledSession()

    await act(async () => {
      await result.current.logout()
    })

    expect(result.current.expiredReason).toBeNull()
  })
})
