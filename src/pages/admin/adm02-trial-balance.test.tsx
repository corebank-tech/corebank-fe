import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "@/mocks/server"
import type { TrialBalanceResponse } from "@/shared/api/generated"
import { Adm02TrialBalance } from "@/pages/admin/adm02-trial-balance"
import { getToday } from "@/shared/config/clock"
import { addDays } from "@/shared/lib/date"

/**
 * 정상 목 데이터로는 실행되지 않는 분기를 서버 응답을 바꿔 끼워 확인한다 — 미등록
 * 계정(REQ-ADM-024), 차대변 불일치(REQ-ADM-022), 조회 실패, 같은 기간 재조회, 기간 한도
 * (REQ-ADM-021). 정상 경로는 e2e
 * (`e2e/admin-trial-balance.spec.ts`)가 본다.
 */

let requestCount = 0

const respond = (data: TrialBalanceResponse) =>
  server.use(
    http.get("*/admin/trial-balance", () => {
      requestCount += 1
      return HttpResponse.json({ code: "0000", message: "성공", data })
    }),
  )

const BASE: TrialBalanceResponse = {
  fromDate: "2026-09-20",
  toDate: "2026-10-20",
  rows: [
    {
      accountCode: "20100",
      accountName: "예수금",
      accountClass: "LIABILITY",
      normalBalance: "CREDIT",
      debitTotal: 100,
      creditTotal: 100,
      entryCount: 2,
    },
  ],
  debitGrandTotal: 100,
  creditGrandTotal: 100,
  difference: 0,
  balanced: true,
  journalEntryCount: 2,
}

const renderPage = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <Adm02TrialBalance />
    </QueryClientProvider>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => {
  server.resetHandlers()
  requestCount = 0
})
afterAll(() => server.close())

describe("Adm02TrialBalance", () => {
  it("계정과목에 없는 코드의 행을 버리지 않고 미등록으로 드러낸다", async () => {
    respond({
      ...BASE,
      rows: [
        ...BASE.rows!,
        {
          accountCode: "99999",
          accountName: null,
          accountClass: null,
          normalBalance: null,
          debitTotal: 0,
          creditTotal: 0,
          entryCount: 1,
        },
      ],
    })

    renderPage()

    expect(await screen.findByText("(계정과목 미등록)")).toBeInTheDocument()
    expect(screen.getByText("미등록")).toBeInTheDocument()
    expect(screen.getByText("99999")).toBeInTheDocument()
  })

  it("차대변이 어긋나면 불일치와 차액을 안내한다", async () => {
    respond({
      ...BASE,
      creditGrandTotal: 70,
      difference: 30,
      balanced: false,
    })

    renderPage()

    expect(
      await screen.findByText("차변 총계와 대변 총계가 일치하지 않습니다"),
    ).toBeInTheDocument()
    expect(screen.queryByText("일치")).not.toBeInTheDocument()
  })

  it("기간을 바꾸지 않고 [조회]·[초기화]를 눌러도 다시 요청한다", async () => {
    // 화면을 열어 둔 사이 새 분개가 들어올 수 있어 [조회]가 새로고침 역할도 한다.
    respond(BASE)
    renderPage()
    await screen.findByText("예수금")
    expect(requestCount).toBe(1)

    fireEvent.click(screen.getByRole("button", { name: "조회" }))
    await waitFor(() => expect(requestCount).toBe(2))

    fireEvent.click(screen.getByRole("button", { name: "초기화" }))
    await waitFor(() => expect(requestCount).toBe(3))
  })

  it("1년보다 오래된 구간도 폭이 365일 이내면 조회할 수 있고, 폭이 넘으면 막는다", async () => {
    // 관리자 시산표는 폭만 제한한다(POL-A07, 서버 TrialBalanceQueryService). 고객 화면의
    // 시작일 소급 1년(REQ-INQR-010)을 적용하면 지난해 구간을 FE가 막는다.
    respond(BASE)
    renderPage()
    await screen.findByText("예수금")

    const start = addDays(getToday(), -800)
    fireEvent.change(screen.getByLabelText("조회 시작일"), {
      target: { value: start },
    })
    fireEvent.change(screen.getByLabelText("조회 종료일"), {
      target: { value: addDays(start, 365) },
    })

    expect(screen.getByRole("button", { name: "조회" })).toBeEnabled()
    expect(screen.queryByText(/조회기간은 최대/)).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("조회 종료일"), {
      target: { value: addDays(start, 366) },
    })

    expect(screen.getByRole("button", { name: "조회" })).toBeDisabled()
    expect(
      screen.getByText(
        "조회기간은 최대 1년 이내여야 합니다. 기간을 다시 선택하세요.",
      ),
    ).toBeInTheDocument()
  })

  it("조회에 실패하면 총계와 일치 배지를 그리지 않고 오류를 표시한다", async () => {
    server.use(
      http.get("*/admin/trial-balance", () =>
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
    expect(screen.queryByText("차변 총계")).not.toBeInTheDocument()
    expect(screen.queryByText("일치")).not.toBeInTheDocument()
    // 조회조건은 남아 있어야 기간을 고쳐 다시 조회할 수 있다.
    expect(screen.getByRole("button", { name: "조회" })).toBeInTheDocument()
  })
})
