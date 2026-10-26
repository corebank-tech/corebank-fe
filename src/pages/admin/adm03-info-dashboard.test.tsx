import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "@/mocks/server"
import type {
  DepositBalancesResponse,
  ProductSubscriptionsResponse,
} from "@/shared/api/generated"
import { Adm03InfoDashboard } from "@/pages/admin/adm03-info-dashboard"

/**
 * 두 API 응답을 바꿔 끼워 지표별 분기를 본다 — 기준시점 동반 표기(REQ-ADM-031),
 * 기준시점 없는 응답(REQ-ADM-032), 한 API 만 실패. 메뉴 진입과 권한은
 * e2e(`e2e/admin-info-dashboard.spec.ts`)가 본다.
 */

let subscriptionQueries: URLSearchParams[] = []

const envelope = (data: unknown) =>
  HttpResponse.json({ code: "0000", message: "성공", data })

const respond = (
  balances: DepositBalancesResponse | "INF9001",
  subscriptions: ProductSubscriptionsResponse | "INF9001",
) => {
  const failure = () =>
    HttpResponse.json(
      { code: "INF9001", message: "정보계 API에 연결하지 못했습니다." },
      { status: 500 },
    )
  server.use(
    http.get("*/admin/info/deposit-balances", () =>
      balances === "INF9001" ? failure() : envelope(balances),
    ),
    http.get("*/admin/info/product-subscriptions", ({ request }) => {
      subscriptionQueries.push(new URL(request.url).searchParams)
      return subscriptions === "INF9001" ? failure() : envelope(subscriptions)
    }),
  )
}

const BALANCES: DepositBalancesResponse = {
  asOf: "2026-10-28",
  items: [
    { baseDate: "2026-10-27", totalBalance: 1_000_000 },
    { baseDate: "2026-10-28", totalBalance: 1_523_400 },
  ],
}

/**
 * 달을 오늘이 속한 달과 겹치지 않는 고정값으로 둔다. 겹치면 "당월 = 서버가 고른 달"
 * 대신 오늘의 달을 쓰는 구현도 이 파일의 단언을 통과한다.
 */
const SUBSCRIPTIONS: ProductSubscriptionsResponse = {
  asOf: "2025-12-31",
  month: "2025-12",
  subscribedCount: 1_200,
  closedCount: 5,
  items: [],
}

const NOT_LOADED_BALANCES: DepositBalancesResponse = { asOf: null, items: [] }
const NOT_LOADED_SUBSCRIPTIONS: ProductSubscriptionsResponse = {
  asOf: null,
  month: null,
  subscribedCount: null,
  closedCount: null,
  items: [],
}

const renderPage = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <Adm03InfoDashboard />
    </QueryClientProvider>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => {
  server.resetHandlers()
  subscriptionQueries = []
})
afterAll(() => server.close())

describe("Adm03InfoDashboard", () => {
  it("숫자마다 자기 API 의 기준시점을 붙이고, 당월은 서버가 고른 달로 적는다", async () => {
    respond(BALANCES, SUBSCRIPTIONS)
    renderPage()

    // 두 API 의 기준시점이 달라도 각자 표기한다(REQ-ADM-031).
    expect(
      await screen.findByText("1,523,400원(기준 2026-10-28 마감)"),
    ).toBeInTheDocument()
    expect(
      await screen.findByText("1,200건(기준 2025-12-31 마감)"),
    ).toBeInTheDocument()
    expect(screen.getByText("5건(기준 2025-12-31 마감)")).toBeInTheDocument()
    // 당월은 오늘의 달이 아니라 서버가 고른 달이라 라벨에 밝힌다. 그러려면 달을
    // 요청에 싣지 않아야 한다 — 실으면 서버가 asOf 의 달을 고르지 않는다.
    expect(screen.getByText("2025년 12월 신규 가입")).toBeInTheDocument()
    expect(screen.getByText("2025년 12월 해지")).toBeInTheDocument()
    expect(subscriptionQueries.at(-1)?.has("month")).toBe(false)
  })

  it("기준시점이 없으면 숫자 대신 안내를 띄운다", async () => {
    respond(NOT_LOADED_BALANCES, NOT_LOADED_SUBSCRIPTIONS)
    renderPage()

    expect(
      await screen.findAllByText(
        "적재된 기준시점이 없어 값을 표시하지 않습니다.",
      ),
    ).toHaveLength(3)
    expect(screen.queryByText(/\d+(원|건)/)).not.toBeInTheDocument()
    expect(screen.getByText("당월 신규 가입")).toBeInTheDocument()
  })

  it("한 API 가 실패해도 다른 API 의 숫자는 보인다", async () => {
    respond("INF9001", SUBSCRIPTIONS)
    renderPage()

    expect(
      await screen.findByText("정보계 API에 연결하지 못했습니다."),
    ).toBeInTheDocument()
    expect(
      await screen.findByText("1,200건(기준 2025-12-31 마감)"),
    ).toBeInTheDocument()
  })
})
