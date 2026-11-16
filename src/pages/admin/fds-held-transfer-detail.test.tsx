import { act, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FdsHeldTransferDetail } from "@/pages/admin/fds-held-transfer-detail"

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
  afterEach(() => vi.useRealTimers())

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

    fireEvent.change(select, { target: { value: "DENIED" } })
    expect(approve).toBeDisabled()
    expect(reject).toBeEnabled()

    fireEvent.change(select, { target: { value: "CONFIRMED" } })
    expect(approve).toBeEnabled()
    expect(reject).toBeDisabled()

    fireEvent.change(select, { target: { value: "UNREACHABLE" } })
    expect(approve).toBeDisabled()
    expect(reject).toBeDisabled()
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
    fireEvent.click(reject)
    expect(screen.getByText("거절 · CUSTOMER_DENIED")).toBeInTheDocument()
  })
})
