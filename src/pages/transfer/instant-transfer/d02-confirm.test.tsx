import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { InstantTransferStep2 } from "@/pages/transfer/instant-transfer/d02-confirm"

const renderStep = (isExecuting: boolean) => {
  const onPrev = vi.fn()
  const onSubmit = vi.fn()
  render(
    <InstantTransferStep2
      steps={["입력", "확인", "완료"]}
      scheduledAt="2026.11.16 10:00:00"
      fromAccount="110-000-000000"
      payeeBank="코어뱅크"
      toAccount="110-000-000001"
      payeeName="이서준"
      amount="10,000"
      fee="0"
      balanceAfter="90,000"
      payeeMemo="-"
      myMemo="-"
      isExecuting={isExecuting}
      onPrev={onPrev}
      onSubmit={onSubmit}
    />,
  )
  return { onPrev, onSubmit }
}

describe("InstantTransferStep2", () => {
  it("행동 이벤트 제출부터 이체 응답까지 이전·재실행을 막고 진행 상태를 알린다", () => {
    const { onPrev, onSubmit } = renderStep(true)

    expect(screen.getByRole("button", { name: "이전" })).toBeDisabled()
    expect(
      screen.getByRole("button", { name: "이체 처리 중..." }),
    ).toBeDisabled()
    expect(screen.getByRole("status")).toHaveTextContent("이체 요청을 처리")
    fireEvent.click(screen.getByRole("button", { name: "이전" }))
    fireEvent.click(screen.getByRole("button", { name: "이체 처리 중..." }))
    expect(onPrev).not.toHaveBeenCalled()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
