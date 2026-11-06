import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "@/mocks/server"
import type { GateRuleCheck } from "@/entities/payment-stop"
import { LedgerEvidence } from "@/widgets/objection/ledger-evidence"

/**
 * 주장 대 원장 대조표와 원장 타임라인. 대조표 상태(확인됨, 모순, 미확인), 근거 거래를 누르면
 * 타임라인의 그 거래가 강조되는지, 타임라인에 다툼 거래와 사기 패턴 창과 60분 안 출금이
 * 그려지는지를 본다.
 */

const okJson = (data: unknown) =>
  HttpResponse.json({ code: "0000", message: "성공", data })

const D1 = "TR202610310000000021"
const D2 = "TR202610310000000022"
const OUT = "TR202610310000000025"
const OLD = "TR202609150000000301"

const RULES: GateRuleCheck[] = [
  {
    rule: "FRAUD_PATTERN",
    description: "다툼 거래 전후 다수 송금인 입금과 즉시 출금",
    basis: "LAW_INTERNAL_METRIC",
    matched: true,
    transactionNumbers: [D1, D2],
    detail: "송금인 4명",
  },
]

const respond = () =>
  server.use(
    http.get("*/admin/objections/:objectionId/agent-runs", () =>
      okJson([{ runId: 21, status: "COMPLETED", attempt: 1 }]),
    ),
    http.get("*/admin/objections/:objectionId/review-draft", () =>
      okJson({
        runId: 21,
        branch: "UNDETERMINED",
        content: {
          evidenceTransactionNumbers: [D1, D2],
          claims: [
            {
              text: "모르는 사람이 보낸 돈이다",
              quote: "모르는 사람이 보낸 돈입니다.",
            },
            {
              text: "계좌를 다른 사람에게 빌려준 적이 없다",
              quote: "계좌를 다른 사람에게 빌려준 적이 없습니다.",
            },
            { text: "체크카드를 잃어버린 적이 없다", quote: null },
          ],
          contradictions: [
            {
              claim: "계좌를 다른 사람에게 빌려준 적이 없다",
              ledgerFact: "입금 직후 타행 출금이 반복됨",
              transactionNumbers: [OUT],
            },
          ],
        },
      }),
    ),
    http.get("*/admin/objections/:objectionId/ledger", () =>
      okJson([
        {
          transactionNumber: OLD,
          direction: "DEPOSIT",
          interbank: false,
          counterpartyAccountId: 4001,
          amount: 2_850_000,
          occurredAt: "2026-09-15T09:00:00",
          disputed: false,
          afterDispute: false,
        },
        {
          transactionNumber: D1,
          direction: "DEPOSIT",
          interbank: true,
          amount: 950_000,
          occurredAt: "2026-10-31T21:40:03",
          disputed: true,
          afterDispute: false,
        },
        {
          transactionNumber: D2,
          direction: "DEPOSIT",
          interbank: true,
          amount: 1_500_000,
          occurredAt: "2026-10-31T21:52:47",
          disputed: true,
          afterDispute: false,
        },
        {
          transactionNumber: OUT,
          direction: "WITHDRAWAL",
          interbank: true,
          amount: 1_400_000,
          occurredAt: "2026-10-31T22:10:41",
          disputed: false,
          afterDispute: true,
        },
      ]),
    ),
  )

const renderEvidence = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <LedgerEvidence objectionId={2} rules={RULES} />
    </QueryClientProvider>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
beforeEach(() => respond())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("LedgerEvidence", () => {
  it("주장마다 확인됨, 모순, 미확인을 가르고 근거 거래를 누르면 타임라인에서 강조한다", async () => {
    renderEvidence()

    const table = await screen.findByRole("region", {
      name: "주장 대 원장 대조표",
    })
    const rowOf = async (text: string) =>
      (await within(table).findByText(text)).closest("tr")!

    const confirmed = await rowOf("모르는 사람이 보낸 돈이다")
    expect(within(confirmed).getByText("확인됨")).toBeInTheDocument()
    const contradicted = await rowOf("계좌를 다른 사람에게 빌려준 적이 없다")
    expect(within(contradicted).getByText("모순")).toBeInTheDocument()
    expect(
      within(contradicted).getByText("입금 직후 타행 출금이 반복됨"),
    ).toBeInTheDocument()
    const unverified = await rowOf("체크카드를 잃어버린 적이 없다")
    expect(within(unverified).getByText("미확인")).toBeInTheDocument()

    // 다툼 전후 24시간 안 거래는 확대 그림의 표시가 이동 대상이다.
    const zoom = await screen.findByTestId("fraud-window")
    const mark = within(zoom).getByRole("button", { name: /출금 1,400,000원/ })
    expect(mark).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(
      within(contradicted).getByRole("button", {
        name: `원장에서 거래 ${OUT} 보기`,
      }),
    )
    expect(mark).toHaveAttribute("aria-pressed", "true")
    expect(mark).toHaveAttribute("id", `ledger-tx-${OUT}`)
  })

  it("타임라인에 다툼 거래, 사기 패턴 24시간 창, 60분 안 출금 화살표를 그린다", async () => {
    renderEvidence()

    const zoom = await screen.findByTestId("fraud-window")
    expect(zoom).toHaveClass("bg-danger-tint")
    expect(screen.getByTestId("fraud-window-overview")).toHaveClass(
      "fill-danger-tint",
    )
    // 다툼 거래는 전체와 확대 양쪽에 그려지고 주의색이다.
    const disputed = within(zoom)
      .getAllByRole("button")
      .filter((node) => node.getAttribute("data-role") === "DISPUTED")
    expect(disputed).toHaveLength(2)
    expect(disputed[0].querySelector("circle")).toHaveClass("fill-warning")
    // 다툼 입금 2건 모두 60분 안에 같은 출금으로 이어진다.
    expect(within(zoom).getAllByTestId("outflow-arrow")).toHaveLength(2)
    expect(screen.getByText(/60분 안 출금 2건/)).toBeInTheDocument()
  })
})
