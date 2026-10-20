import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "@/mocks/server"
import type { TrialBalanceResponse } from "@/shared/api/generated"
import { Adm02TrialBalance } from "@/pages/admin/adm02-trial-balance"

/**
 * 정상 목 데이터로는 실행되지 않는 분기를 서버 응답을 바꿔 끼워 확인한다 — 미등록
 * 계정(REQ-ADM-024), 차대변 불일치(REQ-ADM-022), 조회 실패. 정상 경로는 e2e
 * (`e2e/admin-trial-balance.spec.ts`)가 본다.
 */

const respond = (data: TrialBalanceResponse) =>
  server.use(
    http.get("*/admin/trial-balance", () =>
      HttpResponse.json({ code: "0000", message: "성공", data }),
    ),
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
afterEach(() => server.resetHandlers())
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
