import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "@/mocks/server"
import type { PageResponseLedgerReconciliationMismatchResponse } from "@/shared/api/generated"
import { Adm04ReconciliationMismatches } from "@/pages/admin/adm04-reconciliation-mismatches"

/**
 * 응답을 바꿔 끼워 화면 분기를 본다 — 차액 방향(REQ-ADM-041), 0건 안내(REQ-ADM-042),
 * 쪽 이동 중 영업일 고정과 같은 조건 재조회(REQ-ADM-040), 조회 실패. 메뉴 진입과 목
 * 데이터로 쪽을 넘기는 흐름은 e2e(`e2e/admin-reconciliation.spec.ts`)가 본다.
 */

let requests: URLSearchParams[] = []
const lastQuery = () => requests.at(-1)

const respondWith = (
  reply: (
    query: URLSearchParams,
  ) => PageResponseLedgerReconciliationMismatchResponse,
) =>
  server.use(
    http.get("*/admin/ledger-reconciliation/mismatches", ({ request }) => {
      const query = new URL(request.url).searchParams
      requests.push(query)
      return HttpResponse.json({
        code: "0000",
        message: "성공",
        data: reply(query),
      })
    }),
  )

const respond = (data: PageResponseLedgerReconciliationMismatchResponse) =>
  respondWith(() => data)

const mismatchOn = (businessDate: string, accountId: number) => ({
  businessDate,
  accountId,
  ledgerBalance: 1_000_000,
  accountBalance: 900_000,
  difference: 100_000,
  detectedAt: `${businessDate}T23:31:05+09:00`,
})

const EMPTY = { page: 0, size: 10, totalCount: 0, totalPages: 0, items: [] }

const renderPage = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <Adm04ReconciliationMismatches />
    </QueryClientProvider>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => {
  server.resetHandlers()
  requests = []
})
afterAll(() => server.close())

describe("Adm04ReconciliationMismatches", () => {
  it("차액 부호를 방향 글로 적고, 변경 버튼을 두지 않는다", async () => {
    respond({
      ...EMPTY,
      totalCount: 2,
      totalPages: 1,
      items: [
        {
          businessDate: "2026-10-13",
          accountId: 1001,
          ledgerBalance: 1_000_000,
          accountBalance: 900_000,
          difference: 100_000,
          detectedAt: "2026-10-13T23:31:05+09:00",
        },
        {
          businessDate: "2026-10-13",
          accountId: 1002,
          ledgerBalance: 500_000,
          accountBalance: 600_000,
          difference: -100_000,
          detectedAt: "2026-10-13T23:31:05+09:00",
        },
      ],
    })

    renderPage()

    const shortRow = (await screen.findByText("1001")).closest("tr")!
    const overRow = screen.getByText("1002").closest("tr")!
    expect(within(shortRow).getByText("잔액 부족")).toBeInTheDocument()
    expect(within(overRow).getByText("잔액 초과")).toBeInTheDocument()
    // 영업일을 비우고 조회했으므로 응답의 영업일을 제목에 밝힌다(REQ-ADM-040).
    expect(screen.getByText("[2026.10.13 영업일]")).toBeInTheDocument()
    // 조회·초기화 외의 버튼(정정·수정 등)이 없다.
    expect(
      screen.getAllByRole("button").map((button) => button.textContent),
    ).toEqual(expect.not.arrayContaining([expect.stringMatching(/정정|수정/)]))
  })

  it("기록이 없으면 '일치'라고 말하지 않는다", async () => {
    respond(EMPTY)

    renderPage()

    expect(
      await screen.findByText("기록된 대사 불일치가 없습니다."),
    ).toBeInTheDocument()
    expect(screen.queryByText(/(?<!불)일치/)).not.toBeInTheDocument()
  })

  it("영업일을 지정해 0건이면 대사가 안 돈 날과 구분되지 않는다고 안내한다", async () => {
    respond(EMPTY)
    renderPage()
    await screen.findByText("기록된 대사 불일치가 없습니다.")

    fireEvent.change(screen.getByLabelText("영업일"), {
      target: { value: "2026-10-10" },
    })
    fireEvent.click(screen.getByRole("button", { name: "조회" }))

    expect(
      await screen.findByText(
        "2026.10.10 영업일에 기록된 불일치가 없습니다. 대사가 실행되지 않은 날도 같은 결과가 나옵니다.",
      ),
    ).toBeInTheDocument()
    expect(lastQuery()?.get("businessDate")).toBe("2026-10-10")
  })

  it("영업일을 비운 조회는 쪽을 넘겨도 첫 응답의 영업일을 유지한다", async () => {
    // 서버는 영업일이 비면 요청마다 최신 영업일을 다시 고른다. 첫 응답 뒤에 다음
    // 영업일(10/14) 결과가 저장된 상황을 만든다.
    respondWith((query) => {
      const date =
        query.get("businessDate") ??
        (requests.length === 1 ? "2026-10-13" : "2026-10-14")
      const page = Number(query.get("page"))
      return {
        ...EMPTY,
        page,
        totalCount: 11,
        totalPages: 2,
        items: page === 0 ? [mismatchOn(date, 1001)] : [mismatchOn(date, 1011)],
      }
    })
    renderPage()
    await screen.findByText("[2026.10.13 영업일]")

    fireEvent.click(screen.getByRole("button", { name: "2" }))

    await screen.findByText("1011")
    expect(lastQuery()?.get("businessDate")).toBe("2026-10-13")
    expect(lastQuery()?.get("page")).toBe("1")
    expect(screen.getByText("[2026.10.13 영업일]")).toBeInTheDocument()

    // [조회]는 고정을 풀고 다시 최근 영업일을 묻는다.
    fireEvent.click(screen.getByRole("button", { name: "조회" }))

    expect(await screen.findByText("[2026.10.14 영업일]")).toBeInTheDocument()
    expect(lastQuery()?.has("businessDate")).toBe(false)
    expect(lastQuery()?.get("page")).toBe("0")
  })

  it("조건을 바꾸지 않고 [조회]·[초기화]를 눌러도 다시 요청한다", async () => {
    respond(EMPTY)
    renderPage()
    await screen.findByText("기록된 대사 불일치가 없습니다.")
    expect(requests).toHaveLength(1)

    fireEvent.click(screen.getByRole("button", { name: "조회" }))
    await waitFor(() => expect(requests).toHaveLength(2))

    fireEvent.click(screen.getByRole("button", { name: "초기화" }))
    await waitFor(() => expect(requests).toHaveLength(3))
  })

  it("조회에 실패하면 오류를 표시하고 영업일 제목을 그리지 않는다", async () => {
    server.use(
      http.get("*/admin/ledger-reconciliation/mismatches", () =>
        HttpResponse.json(
          { code: "CMN0102", message: "해당 자원에 접근할 권한이 없습니다." },
          { status: 403 },
        ),
      ),
    )

    renderPage()

    expect(
      await screen.findByText("해당 자원에 접근할 권한이 없습니다."),
    ).toBeInTheDocument()
    expect(screen.queryByText(/영업일\]/)).not.toBeInTheDocument()
  })
})
