import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router"
import { http, HttpResponse } from "msw"
import { server } from "@/mocks/server"
import type { AdminPermission } from "@/entities/auth"
import {
  SessionContext,
  type SessionContextValue,
} from "@/features/session/model/session-context-value"
import type { ObjectionSummaryResponse } from "@/shared/api/generated"
import { Adm05ObjectionList } from "@/pages/admin/adm05-objection-list"

const SUMMARIES: ObjectionSummaryResponse[] = [
  {
    objectionId: 3,
    caseId: 13,
    accountId: 2003,
    clause: 2,
    objectionStatus: "RECEIVED",
    caseStatus: "STOPPED",
    disputedTotal: 1_200_000,
    objectionDeadline: "2026-12-15",
    receivedAt: "2026-11-03T10:21:40",
  },
  {
    objectionId: 1,
    caseId: 11,
    accountId: 2001,
    clause: 3,
    objectionStatus: "DECIDED",
    caseStatus: "PARTIAL",
    disputedTotal: 300_000,
    objectionDeadline: "2026-12-15",
    receivedAt: "2026-10-27T11:45:00",
  },
]

const respond = (reply: () => ReturnType<typeof HttpResponse.json>) =>
  server.use(http.get("*/admin/objections", reply))

const sessionWith = (permissions: AdminPermission[]): SessionContextValue => ({
  isAuthenticated: true,
  isBootstrapping: false,
  customerName: "관리자",
  role: "ADMIN",
  permissions,
  remainingSeconds: 1800,
  expiredReason: null,
  isLoggingOut: false,
  setSession: async () => true,
  logout: async () => {},
  extend: () => {},
  acknowledgeExpired: () => {},
})

const renderList = (permissions: AdminPermission[]) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <SessionContext.Provider value={sessionWith(permissions)}>
        <MemoryRouter>
          <Adm05ObjectionList />
        </MemoryRouter>
      </SessionContext.Provider>
    </QueryClientProvider>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("Adm05ObjectionList", () => {
  it("행마다 사유와 상태를 업무 용어로 그린다", async () => {
    respond(() =>
      HttpResponse.json({ code: "0000", message: "성공", data: SUMMARIES }),
    )
    renderList(["PAYMENT_STOP_READ", "PAYMENT_STOP_WRITE"])

    const waitingRow = (
      await screen.findByRole("link", { name: "이의제기 3 심사" })
    ).closest("tr")!
    expect(
      within(waitingRow).getByText("제2호 정당한 대가로 받은 돈"),
    ).toBeInTheDocument()
    expect(within(waitingRow).getByText("전부 지급정지")).toBeInTheDocument()
    expect(within(waitingRow).getByText("판정 대기")).toBeInTheDocument()
    expect(within(waitingRow).getByText("1,200,000원")).toBeInTheDocument()

    const decidedRow = screen
      .getByRole("link", { name: "이의제기 1 심사" })
      .closest("tr")!
    expect(within(decidedRow).getByText("일부 지급정지")).toBeInTheDocument()
    expect(within(decidedRow).getByText("판정 확정")).toBeInTheDocument()

    expect(screen.getByText("[총 2건]")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "대리 접수" }),
    ).toBeInTheDocument()
  })

  it("조회 권한만 있으면 대리 접수 버튼을 그리지 않는다", async () => {
    respond(() =>
      HttpResponse.json({ code: "0000", message: "성공", data: SUMMARIES }),
    )
    renderList(["PAYMENT_STOP_READ"])

    await screen.findByText("[총 2건]")
    expect(
      screen.queryByRole("button", { name: "대리 접수" }),
    ).not.toBeInTheDocument()
  })

  it("조회에 실패하면 서버 문구를 목록 자리에 보인다", async () => {
    respond(() =>
      HttpResponse.json(
        { code: "CMN0102", message: "해당 자원에 접근할 권한이 없습니다." },
        { status: 403 },
      ),
    )
    renderList(["PAYMENT_STOP_READ"])

    expect(
      await screen.findByText("해당 자원에 접근할 권한이 없습니다."),
    ).toBeInTheDocument()
  })
})
