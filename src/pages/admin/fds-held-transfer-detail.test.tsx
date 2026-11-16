import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { MemoryRouter, Route, Routes } from "react-router"
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest"
import { FdsHeldTransferDetail } from "@/pages/admin/fds-held-transfer-detail"
import { server } from "@/mocks/server"
import { formatDateTime } from "@/shared/lib/format"

const renderPage = (id = "102") => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const view = render(
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
  return { ...view, client }
}

describe("FdsHeldTransferDetail", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
  beforeEach(() => sessionStorage.clear())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it("실제 transferHoldId로 상세을 조회하고 서버 응답을 표시한다", async () => {
    renderPage()
    expect(await screen.findByText("사건 ID 102")).toBeInTheDocument()
    expect(screen.getAllByText(/고객 부인/).length).toBeGreaterThan(0)
    expect(screen.getByText("10분 이체 건수")).toBeInTheDocument()
    expect(screen.getByText("확인 화면 복귀")).toBeInTheDocument()
    expect(screen.queryByText("수취인 관계")).not.toBeInTheDocument()
    expect(screen.getByText(/거래 9001/)).toBeInTheDocument()
    expect(screen.getAllByText("최종 처리 전")).toHaveLength(2)
    expect(
      screen.getByText("근거 수준 직접 관찰 · 근거 거래 2건"),
    ).toBeInTheDocument()
    expect(screen.queryByText(/신뢰도 OBSERVED/)).not.toBeInTheDocument()
    expect(screen.getAllByText("최근 이체 이력")).toHaveLength(1)
    expect(
      screen.getByText("고객 질문 제안").closest(".fds-agent-question"),
    ).toBeInTheDocument()
    expect(screen.queryByText(/"backCount"/)).not.toBeInTheDocument()
  })

  it("NO_MATCH의 최신 고객 부인 결과에는 두 거절 조치만 허용한다", async () => {
    renderPage()
    expect(await screen.findByRole("button", { name: "승인" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "일반 거절" })).toBeEnabled()
    expect(
      screen.getByRole("button", { name: "사기 확정 및 거절" }),
    ).toBeEnabled()
    expect(
      screen.getByText(/CUSTOMER_DENIED 거절만 사용할 수 있습니다/),
    ).toBeInTheDocument()
    expect(
      screen.getByText((_, element) => {
        const text = element?.textContent ?? ""
        return (
          element?.tagName === "P" &&
          text.includes(formatDateTime("2026-11-15T09:20:00+09:00")) &&
          text.includes("고객 부인")
        )
      }),
    ).toBeInTheDocument()
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
    expect((await screen.findAllByText("COMPLETED")).length).toBeGreaterThan(0)
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

  it("폴링 재조회가 실패해도 마지막 상세를 유지하고 작은 안내만 표시한다", async () => {
    const { client } = renderPage("103")
    expect(await screen.findByText("사건 ID 103")).toBeInTheDocument()
    server.use(
      http.get("*/admin/fds/holds/:transferHoldId", () =>
        HttpResponse.json(
          {
            code: "CMN9999",
            message: "일시적으로 상세를 조회할 수 없습니다.",
            data: null,
          },
          { status: 503 },
        ),
      ),
    )

    await client.refetchQueries()

    expect(
      await screen.findByText(/마지막으로 확인한 정보를 표시하고/),
    ).toBeInTheDocument()
    expect(screen.getByText("사건 ID 103")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "다시 시도" }),
    ).not.toBeInTheDocument()
  })
})
