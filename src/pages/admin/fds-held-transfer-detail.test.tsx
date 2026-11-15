import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { FdsHeldTransferDetail } from "@/pages/admin/fds-held-transfer-detail"
import { server } from "@/mocks/server"

const renderPage = (id = "102") => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/admin/fds/held-transfers/${id}`]}>
        <Routes>
          <Route
            path="/admin/fds/held-transfers/:heldTransferId"
            element={<FdsHeldTransferDetail />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("FdsHeldTransferDetail", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
  beforeEach(() => sessionStorage.clear())
  afterAll(() => server.close())

  it("실제 transferHoldId로 상세을 조회하고 서버 응답을 표시한다", async () => {
    renderPage()
    expect(await screen.findByText("사건 ID 102")).toBeInTheDocument()
    expect(screen.getAllByText(/고객 부인/).length).toBeGreaterThan(0)
  })

  it("NO_MATCH의 최신 고객 부인 결과에는 두 거절 조치만 허용한다", async () => {
    renderPage()
    expect(await screen.findByRole("button", { name: "승인" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "일반 거절" })).toBeEnabled()
    expect(
      screen.getByRole("button", { name: "사기 확정 및 거절" }),
    ).toBeEnabled()
  })

  it("MATCH는 위험 계좌 일치 거절만 허용한다", async () => {
    renderPage("101")
    expect(
      await screen.findByRole("button", { name: "위험 계좌 일치로 거절" }),
    ).toBeEnabled()
    expect(screen.getByRole("button", { name: "승인" })).toBeDisabled()
    expect(
      screen.getByRole("button", { name: "사기 확정 및 거절" }),
    ).toBeDisabled()
  })

  it("조치 전 사건·조치·사유가 있는 확인 모달을 표시한다", async () => {
    renderPage()
    fireEvent.click(await screen.findByRole("button", { name: "일반 거절" }))
    expect(screen.getByRole("dialog")).toHaveTextContent("사건 ID")
    expect(screen.getByRole("dialog")).toHaveTextContent("CUSTOMER_DENIED")
    expect(screen.getByRole("dialog")).toHaveTextContent("되돌릴 수 없습니다")
  })

  it("완료 후 서버 reasonCode를 그대로 복원한다", async () => {
    const view = renderPage()
    fireEvent.click(await screen.findByRole("button", { name: "일반 거절" }))
    fireEvent.click(screen.getByRole("button", { name: "조치 실행" }))
    await screen.findByText("COMPLETED")
    view.unmount()
    renderPage()
    await waitFor(() =>
      expect(screen.getByText("CUSTOMER_DENIED")).toBeInTheDocument(),
    )
  })

  it("404 사건을 별도 처리한다", async () => {
    renderPage("999")
    expect(
      await screen.findByText("존재하지 않는 FDS 보류 사건입니다."),
    ).toBeInTheDocument()
  })
})
