import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { FdsHeldTransferList } from "@/pages/admin/fds-held-transfer-list"
import { server } from "@/mocks/server"

const renderPage = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>
        <FdsHeldTransferList />
      </MemoryRouter>
    </QueryClientProvider>,
  )

describe("FdsHeldTransferList", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
  afterAll(() => server.close())

  it("서버 목록의 실제 transferHoldId와 페이징 결과를 표시한다", async () => {
    renderPage()
    expect(await screen.findByText("101")).toBeInTheDocument()
    expect(screen.getByText("102")).toBeInTheDocument()
    expect(screen.getByText("조회결과 (3건)")).toBeInTheDocument()
  })

  it("선택한 위험 상태를 서버 필터 요청에 반영한다", async () => {
    renderPage()
    await screen.findByText("101")
    fireEvent.change(screen.getByLabelText("위험 계좌"), {
      target: { value: "MATCH" },
    })
    fireEvent.click(screen.getByRole("button", { name: "조회" }))
    await waitFor(() =>
      expect(screen.getByText("조회결과 (1건)")).toBeInTheDocument(),
    )
    expect(screen.queryByText("102")).not.toBeInTheDocument()
  })
})
