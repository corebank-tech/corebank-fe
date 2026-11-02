import { describe, expect, it } from "vitest"
import { TransferResponseStatus } from "@/shared/api/generated"
import { isConfirmedTransferStatus } from "@/entities/transfer/lib/transfer-result"

/**
 * D-03 결과 화면이 [새 이체하기] 를 여는 기준이다. 미확정 건에서 폼을 비워 주면 고객이
 * 같은 이체를 다시 넣어 두 번 입금될 수 있어, 상태별 판정을 표로 고정한다.
 */
describe("isConfirmedTransferStatus", () => {
  it.each([
    [TransferResponseStatus.SUCCESS, true],
    [TransferResponseStatus.ERROR, true],
    [TransferResponseStatus.PROCESSING, false],
    [TransferResponseStatus.TIMEOUT, false],
  ])("%s 는 %s", (status, expected) => {
    expect(isConfirmedTransferStatus(status)).toBe(expected)
  })

  it("스펙에 없는 값과 빈 값은 미확정으로 본다", () => {
    expect(isConfirmedTransferStatus("REVERSED")).toBe(false)
    expect(isConfirmedTransferStatus(undefined)).toBe(false)
  })
})
