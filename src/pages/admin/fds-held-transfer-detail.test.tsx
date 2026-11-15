import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
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
import { FdsHeldTransferDetail } from "@/pages/admin/fds-held-transfer-detail"
import { server } from "@/mocks/server"

const renderPage = (id = "policy-b-no-match") =>
  render(
    <MemoryRouter initialEntries={[`/admin/fds/held-transfers/${id}`]}>
      <Routes>
        <Route
          path="/admin/fds/held-transfers/:heldTransferId"
          element={<FdsHeldTransferDetail />}
        />
      </Routes>
    </MemoryRouter>,
  )

const moveToHumanDecision = () => {
  for (let index = 0; index < 7; index += 1) {
    act(() => vi.runOnlyPendingTimers())
  }
}

describe("FdsHeldTransferDetail", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
  beforeEach(() => sessionStorage.clear())
  afterEach(() => vi.useRealTimers())
  afterAll(() => server.close())

  it("fixture 요청 시각을 타임라인에 표시한다", () => {
    renderPage()

    expect(screen.getByText("09:12 · 미기표")).toBeInTheDocument()
  })

  it("Agent 확인 사항을 해당 조사 단계 전에는 공개하지 않는다", () => {
    renderPage()

    expect(
      screen.queryByText("수취인과 거래 목적에 대한 고객 확인이 필요합니다."),
    ).not.toBeInTheDocument()
  })

  it("콜 결과에 맞는 승인·거절 조합만 허용한다", () => {
    vi.useFakeTimers()
    renderPage()
    moveToHumanDecision()

    const select = screen.getByLabelText("콜 결과")
    const approve = screen.getByRole("button", { name: "승인" })
    const reject = screen.getByRole("button", { name: "거절" })
    const fraudReject = screen.getByRole("button", {
      name: "사기 확정 및 거절",
    })

    fireEvent.change(select, { target: { value: "DENIED" } })
    expect(approve).toBeDisabled()
    expect(reject).toBeEnabled()
    expect(fraudReject).toBeEnabled()

    fireEvent.change(select, { target: { value: "CONFIRMED" } })
    expect(approve).toBeEnabled()
    expect(reject).toBeDisabled()
    expect(fraudReject).toBeDisabled()

    fireEvent.change(select, { target: { value: "UNREACHABLE" } })
    expect(approve).toBeDisabled()
    expect(reject).toBeDisabled()
    expect(fraudReject).toBeDisabled()
  })

  it("관리자 조치 전에 사유를 보여주는 확인 모달을 연다", () => {
    vi.useFakeTimers()
    renderPage()
    moveToHumanDecision()
    fireEvent.change(screen.getByLabelText("콜 결과"), {
      target: { value: "DENIED" },
    })

    fireEvent.click(screen.getByRole("button", { name: "거절" }))
    const dialog = screen.getByRole("dialog", { name: "관리자 조치 확인" })
    expect(within(dialog).getByText(/CUSTOMER_DENIED/)).toBeInTheDocument()
    expect(
      within(dialog).getByText("이 보류 이체를 거절합니다."),
    ).toBeInTheDocument()
  })

  it("일반 거절과 사기 확정 거절을 별도 API 조치와 사유로 표시한다", async () => {
    vi.useFakeTimers()
    renderPage()
    moveToHumanDecision()
    vi.useRealTimers()
    fireEvent.change(screen.getByLabelText("콜 결과"), {
      target: { value: "DENIED" },
    })

    fireEvent.click(screen.getByRole("button", { name: "거절" }))
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "거절",
      }),
    )
    expect(
      await screen.findByText("거절 · CUSTOMER_DENIED"),
    ).toBeInTheDocument()

    sessionStorage.clear()
  })

  it("사기 확정 거절은 전용 확인 모달 사유를 표시한다", () => {
    vi.useFakeTimers()
    renderPage()
    moveToHumanDecision()
    fireEvent.change(screen.getByLabelText("콜 결과"), {
      target: { value: "DENIED" },
    })

    fireEvent.click(screen.getByRole("button", { name: "사기 확정 및 거절" }))
    expect(
      within(screen.getByRole("dialog")).getByText(/FRAUD_CONFIRMED/),
    ).toBeInTheDocument()
  })

  it("새로고침 뒤 서버 상세의 완료 조치를 복원한다", async () => {
    sessionStorage.setItem(
      "corebank-mock:fds:admin-action:102",
      JSON.stringify({
        actionId: "action-restored",
        actionType: "REJECT",
        status: "COMPLETED",
        reasonCode: "CUSTOMER_DENIED",
        recoveryRequired: false,
      }),
    )
    vi.useFakeTimers()
    renderPage()
    moveToHumanDecision()
    vi.useRealTimers()

    expect(
      await screen.findByText("거절 · CUSTOMER_DENIED"),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "거절" })).toBeDisabled()
  })

  it("응답 유실로 남은 요청은 같은 멱등키로 재시도하고 서버 상태로 수렴한다", async () => {
    sessionStorage.setItem(
      "corebank:fds-admin-action:102",
      JSON.stringify({
        decision: "REJECT",
        idempotencyKey: "lost-action-key",
        callRecordIdempotencyKey: "lost-call-key",
      }),
    )
    vi.useFakeTimers()
    renderPage()
    moveToHumanDecision()
    vi.useRealTimers()

    expect(
      await screen.findByText("거절 · CUSTOMER_DENIED"),
    ).toBeInTheDocument()
    expect(sessionStorage.getItem("corebank:fds-admin-action:102")).toBeNull()
  })

  it("조사 장애 건도 고객 확인 결과에 따라 승인·거절한다", () => {
    vi.useFakeTimers()
    renderPage("agent-failure-unavailable")
    moveToHumanDecision()

    const select = screen.getByLabelText("콜 결과")
    const approve = screen.getByRole("button", { name: "승인" })
    const reject = screen.getByRole("button", { name: "거절" })

    fireEvent.change(select, { target: { value: "CONFIRMED" } })
    expect(approve).toBeEnabled()
    expect(reject).toBeDisabled()

    fireEvent.change(select, { target: { value: "DENIED" } })
    expect(approve).toBeDisabled()
    expect(reject).toBeEnabled()
  })
})
