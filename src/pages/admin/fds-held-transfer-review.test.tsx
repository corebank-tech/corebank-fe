import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { FdsHeldTransferReview } from "@/pages/admin/fds-held-transfer-review"
import {
  createFdsAdminDetail,
  FDS_ADMIN_SCENARIOS,
} from "@/mocks/fixtures/fds-admin"

describe("FdsHeldTransferReview", () => {
  afterEach(() => vi.useRealTimers())

  it("화면 진입 즉시 실제 서버의 현재 처리 단계를 표시한다", () => {
    render(
      <FdsHeldTransferReview detail={createFdsAdminDetail(102, "NO_MATCH")} />,
    )
    const firstStep = screen.getByText("이체 보류").closest("li")
    expect(firstStep).toHaveAttribute("data-state", "done")
    expect(firstStep?.querySelector(".fds-step-dot")).toHaveTextContent("✓")
    expect(screen.getByText("담당자 판정").closest("li")).toHaveAttribute(
      "data-state",
      "active",
    )
    expect(screen.getByText("담당자 확인 대기")).toBeInTheDocument()
    expect(screen.getByText("조치 선택 대기")).toBeInTheDocument()
    expect(screen.queryByText("· 사유 -")).not.toBeInTheDocument()
  })

  it("다시 보기 버튼을 누른 경우에만 1단계부터 1초 간격으로 재생한다", () => {
    vi.useFakeTimers()
    render(
      <FdsHeldTransferReview detail={createFdsAdminDetail(102, "NO_MATCH")} />,
    )

    fireEvent.click(screen.getByRole("button", { name: "처리 과정 다시 보기" }))
    expect(screen.getByRole("button", { name: "재생 중" })).toBeDisabled()
    expect(screen.getByText("원본 이체 보류")).toBeInTheDocument()
    expect(screen.getByText("이체 보류").closest("li")).toHaveAttribute(
      "data-state",
      "active",
    )

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText("조사 작업 대기")).toBeInTheDocument()
    expect(screen.getByText("조사 등록").closest("li")).toHaveAttribute(
      "data-state",
      "active",
    )

    for (let index = 0; index < 5; index += 1) {
      act(() => vi.advanceTimersByTime(1000))
    }
    const stepRail = screen.getByRole("list", { name: "FDS 사건 처리 단계" })
    expect(
      within(stepRail).getByText("고객 확인").closest("li"),
    ).toHaveAttribute("data-state", "active")

    act(() => vi.advanceTimersByTime(1000))
    expect(
      screen.getByRole("button", { name: "처리 과정 다시 보기" }),
    ).toBeEnabled()
    expect(screen.getByText("담당자 확인 대기")).toBeInTheDocument()
  })

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
    const detail = createFdsAdminDetail(102, "NO_MATCH")
    detail.toolResults?.history?.items?.reverse()
    render(<FdsHeldTransferReview detail={detail} />)
    const timeline = screen.getByTestId("fds-transfer-timeline")
    expect(within(timeline).getAllByText("성공 (SUCCESS)")).toHaveLength(2)
    expect(within(timeline).getByText("현재 요청 102")).toBeInTheDocument()
    expect(within(timeline).getByText("보류 (HELD)")).toBeInTheDocument()
    const content = timeline.textContent ?? ""
    expect(content.indexOf("9001")).toBeLessThan(content.indexOf("9002"))
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

  it("고객 확인 단계에서는 서버 재조회가 아니라 관리자 입력 대기를 안내한다", () => {
    const detail = structuredClone(FDS_ADMIN_SCENARIOS.investigationCompleted)
    detail.callRecords = []
    render(<FdsHeldTransferReview detail={detail} />)
    const notice = screen
      .getByText("고객 확인 결과 입력을 기다리고 있습니다.")
      .closest("div")
    expect(notice).toBeInTheDocument()
    expect(notice?.querySelector(".fds-wait-dots")).toBeInTheDocument()
    expect(notice?.querySelector(".lucide-database")).not.toBeInTheDocument()
    expect(
      screen.queryByText("실제 서버 처리 상태를 재조회하고 있습니다."),
    ).not.toBeInTheDocument()
  })
})
