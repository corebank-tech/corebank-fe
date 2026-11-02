import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { TransferResponseStatus } from "@/entities/transfer"
import { InstantTransferStep3 } from "@/pages/transfer/instant-transfer/d03-result"

/**
 * 미확정 결과에서 [새 이체하기] 가 보이면 고객이 같은 이체를 다시 넣어 두 번 입금될 수
 * 있다(corebank-server docs/phase2/interbank_transfer_fe_handoff.md §5-1). 버튼이 footer
 * 슬롯에 있어 조건이 어긋나도 화면이 멀쩡해 보이므로 상태별 노출을 표로 고정한다.
 */
const renderStep3 = (status?: TransferResponseStatus) => {
  render(
    <InstantTransferStep3
      steps={["입력", "확인", "결과"]}
      status={status}
      onNewTransfer={vi.fn()}
    />,
  )
}

const newTransferButton = () =>
  screen.queryByRole("button", { name: "새 이체하기" })

describe("InstantTransferStep3 — 새 이체 버튼 노출", () => {
  it.each([
    [TransferResponseStatus.SUCCESS, true],
    [TransferResponseStatus.ERROR, true],
    [TransferResponseStatus.PROCESSING, false],
    [TransferResponseStatus.TIMEOUT, false],
  ])("%s 면 버튼 노출은 %s", (status, isVisible) => {
    renderStep3(status)
    expect(newTransferButton() != null).toBe(isVisible)
  })

  it("상태가 없으면 미확정으로 보고 버튼을 그리지 않는다", () => {
    renderStep3(undefined)
    expect(newTransferButton()).toBeNull()
  })
})
