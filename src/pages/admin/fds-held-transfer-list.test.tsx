import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"
import { FdsHeldTransferList } from "@/pages/admin/fds-held-transfer-list"

const renderPage = () =>
  render(
    <MemoryRouter>
      <FdsHeldTransferList />
    </MemoryRouter>,
  )

describe("FdsHeldTransferList", () => {
  it("A·B·Agent 장애 fixture를 보류 목록에 표시한다", () => {
    renderPage()

    expect(screen.getByText("FDS-DEMO-A01")).toBeInTheDocument()
    expect(screen.getByText("FDS-DEMO-B01")).toBeInTheDocument()
    expect(screen.getByText("FDS-DEMO-E01")).toBeInTheDocument()
  })

  it("정책과 조사 상태를 로컬 상태로 필터링한다", () => {
    renderPage()

    fireEvent.change(screen.getByLabelText("보류 정책"), {
      target: { value: "A" },
    })
    fireEvent.click(screen.getByRole("button", { name: "조회" }))

    expect(screen.getByText("FDS-DEMO-A01")).toBeInTheDocument()
    expect(screen.queryByText("FDS-DEMO-B01")).not.toBeInTheDocument()
    expect(screen.queryByText("FDS-DEMO-E01")).not.toBeInTheDocument()
  })
})
