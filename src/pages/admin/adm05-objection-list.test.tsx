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
import { act, fireEvent, render, screen, within } from "@testing-library/react"
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
    objectionStatus: "UNDER_REVIEW",
    caseStatus: "STOPPED",
    disputedTotal: 1_200_000,
    objectionDeadline: "2026-12-15",
    receivedAt: "2026-11-03T10:21:40",
    reviewDeadline: "2026-11-10",
    deadlineAlert: true,
    supplementOverdue: false,
    latestRunStatus: "RUNNING",
    latestRunLastStepTitle: "송금인과의 과거 거래 조회",
  },
  {
    objectionId: 4,
    caseId: 14,
    accountId: 2004,
    clause: 2,
    objectionStatus: "SUPPLEMENT_REQUESTED",
    caseStatus: "STOPPED",
    disputedTotal: 2_000_000,
    objectionDeadline: "2026-12-15",
    receivedAt: "2026-10-23T13:40:00",
    // 서버는 보완을 요청하면 심사 기한을 비우고 보완 기한을 준다.
    supplementDue: "2026-10-30",
    deadlineAlert: false,
    supplementOverdue: true,
    latestRunStatus: "COMPLETED",
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
    latestRunStatus: "COMPLETED",
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

let runRequests: string[] = []

/** 목록은 행마다 실행 목록을 묻지 않는다(N+1 제거). 오면 세어 둔다. */
const respondRuns = () =>
  server.use(
    http.get("*/admin/objections/:objectionId/agent-runs", ({ params }) => {
      runRequests.push(String(params.objectionId))
      return HttpResponse.json({ code: "0000", message: "성공", data: [] })
    }),
  )

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
beforeEach(() => respondRuns())
afterEach(() => {
  server.resetHandlers()
  runRequests = []
})
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
    expect(within(waitingRow).getByText("심사 중")).toBeInTheDocument()
    expect(within(waitingRow).getByText("1,200,000원")).toBeInTheDocument()
    // 심사 기한 경보는 서버 `deadlineAlert` 로 빨간 표시를 한다.
    const deadline = within(waitingRow).getByRole("status", {
      name: /심사 기한 2026\.11\.10/,
    })
    expect(deadline).toHaveAccessibleName(/기한 임박/)

    // 보완 기한이 지난 건은 불수용 대상으로 표시한다.
    const overdueRow = screen
      .getByRole("link", { name: "이의제기 4 심사" })
      .closest("tr")!
    expect(within(overdueRow).getByText("불수용 대상")).toBeInTheDocument()
    expect(within(overdueRow).getByText("보완 요청")).toBeInTheDocument()
    // 보완 중에는 심사 기한 대신 보완 기한을 보인다.
    expect(
      within(overdueRow).getByRole("status", {
        name: /보완 기한 2026\.10\.30.*기한 임박/,
      }),
    ).toBeInTheDocument()
    expect(
      within(overdueRow).queryByText("완비 확인 전"),
    ).not.toBeInTheDocument()

    // 링크의 접근 이름은 보이는 글자와 같은 동작을 말한다.
    const decidedRow = screen
      .getByRole("link", { name: "이의제기 1 상세" })
      .closest("tr")!
    expect(within(decidedRow).getByText("일부 지급정지")).toBeInTheDocument()
    expect(within(decidedRow).getByText("판정 확정")).toBeInTheDocument()

    expect(screen.getByText("[총 3건]")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "대리 접수" }),
    ).toBeInTheDocument()

    // AI 분석 상태는 목록 요약 필드로 그린다. 분석 중이면 마지막 단계 이름, 끝났으면 완료.
    expect(
      within(waitingRow).getByText("송금인과의 과거 거래 조회"),
    ).toBeInTheDocument()
    expect(within(decidedRow).getByText("완료")).toBeInTheDocument()
    expect(runRequests).toEqual([])
  })

  it("조회 권한만 있으면 대리 접수 버튼을 그리지 않는다", async () => {
    respond(() =>
      HttpResponse.json({ code: "0000", message: "성공", data: SUMMARIES }),
    )
    renderList(["PAYMENT_STOP_READ"])

    await screen.findByText("[총 3건]")
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

  it("다시 받기가 실패해도 이미 받은 목록은 그대로 두고 실패만 알린다", async () => {
    let calls = 0
    respond(() => {
      calls += 1
      return calls === 1
        ? HttpResponse.json({ code: "0000", message: "성공", data: SUMMARIES })
        : HttpResponse.json(
            { code: "CMN9999", message: "일시적인 오류입니다." },
            { status: 500 },
          )
    })
    renderList(["PAYMENT_STOP_READ"])

    await screen.findByText("[총 3건]")
    // 분석 중인 행이 있어 2초 뒤 다시 받는다.
    expect(
      await screen.findByText(
        /목록을 다시 받지 못했습니다/,
        {},
        { timeout: 4000 },
      ),
    ).toBeInTheDocument()
    expect(screen.getByText("[총 3건]")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "이의제기 3 심사" }),
    ).toBeInTheDocument()
  })

  it("대기 행만 1분 넘게 남으면 자동 갱신을 멈추고 다시 확인을 받는다", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      let calls = 0
      respond(() => {
        calls += 1
        return HttpResponse.json({
          code: "0000",
          message: "성공",
          data: SUMMARIES.map((row) =>
            row.latestRunStatus === "RUNNING"
              ? { ...row, latestRunStatus: "QUEUED" }
              : row,
          ),
        })
      })
      renderList(["PAYMENT_STOP_READ"])
      await screen.findByText("[총 3건]")

      await act(async () => {
        await vi.advanceTimersByTimeAsync(61_000)
      })
      expect(screen.getByText("분석 대기가 길어짐")).toBeInTheDocument()
      const stoppedAt = calls

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000)
      })
      expect(calls).toBe(stoppedAt)

      fireEvent.click(screen.getByRole("button", { name: "다시 확인" }))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })
      expect(calls).toBeGreaterThan(stoppedAt)
      expect(screen.queryByText("분석 대기가 길어짐")).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
