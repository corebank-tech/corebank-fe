import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FdsHeldTransferReview } from "@/pages/admin/fds-held-transfer-review"
import {
  createFdsAdminDetail,
  FDS_ADMIN_SCENARIOS,
} from "@/mocks/fixtures/fds-admin"

describe("FdsHeldTransferReview", () => {
  it("실제 조사 PENDING 응답으로 조사 등록 단계를 현재 상태로 표시한다", () => {
    render(
      <FdsHeldTransferReview
        detail={FDS_ADMIN_SCENARIOS.investigationPending}
      />,
    )
    expect(screen.getByText("조사 작업 대기")).toBeInTheDocument()
    expect(screen.getByText("조사 등록").closest("li")).toHaveAttribute(
      "data-state",
      "active",
    )
  })

  it("history.items만 성공 이력으로 쓰고 현재 요청을 마지막 HELD로 표시한다", () => {
    render(
      <FdsHeldTransferReview detail={createFdsAdminDetail(102, "NO_MATCH")} />,
    )
    const timeline = screen.getByTestId("fds-transfer-timeline")
    expect(within(timeline).getAllByText("성공 (SUCCESS)")).toHaveLength(2)
    expect(within(timeline).getByText("현재 요청 102")).toBeInTheDocument()
    expect(within(timeline).getByText("보류 (HELD)")).toBeInTheDocument()
  })

  it("제공된 성공 이력이 없으면 가짜 거래 대신 빈 상태를 표시한다", () => {
    render(
      <FdsHeldTransferReview detail={createFdsAdminDetail(101, "MATCH")} />,
    )
    expect(
      screen.getByText("제공된 최근 성공 이체 이력이 없습니다."),
    ).toBeInTheDocument()
    expect(screen.queryByText("성공 이체 1")).not.toBeInTheDocument()
  })

  it("조사 실패를 실패 단계로 표시하고 JSON 코드 블록은 만들지 않는다", () => {
    const { container } = render(
      <FdsHeldTransferReview
        detail={FDS_ADMIN_SCENARIOS.investigationFailed}
      />,
    )
    expect(screen.getByText("Agent 조사").closest("li")).toHaveAttribute(
      "data-state",
      "failed",
    )
    expect(container.querySelector("pre")).not.toBeInTheDocument()
  })
})
