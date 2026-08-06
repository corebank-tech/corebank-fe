import { describe, expect, it } from "vitest"
import { MOCK_AUTO_TRANSFERS, MOCK_RESERVATIONS } from "@/entities/transfer"
import { getWithdrawalDeleteBlockReason } from "@/features/withdrawal-account"

describe("getWithdrawalDeleteBlockReason", () => {
  it("대기 예약이체가 있으면 예약이체 차단 사유를 반환한다", () => {
    expect(
      getWithdrawalDeleteBlockReason(
        "110632892336",
        MOCK_RESERVATIONS,
        MOCK_AUTO_TRANSFERS,
      ),
    ).toBe("대기 상태의 예약이체가 등록되어 있어 삭제할 수 없습니다.")
  })

  it("대기 예약이체가 없고 정상 자동이체가 있으면 자동이체 차단 사유를 반환한다", () => {
    const reservationsWithoutTargetAccount = MOCK_RESERVATIONS.filter(
      (reservation) => reservation.fromAccountNo !== "302998112233",
    )

    expect(
      getWithdrawalDeleteBlockReason(
        "302998112233",
        reservationsWithoutTargetAccount,
        MOCK_AUTO_TRANSFERS,
      ),
    ).toBe("정상 상태의 자동이체가 등록되어 있어 삭제할 수 없습니다.")
  })

  it("차단하는 이체가 없으면 null을 반환한다", () => {
    expect(
      getWithdrawalDeleteBlockReason(
        "255104778910",
        MOCK_RESERVATIONS,
        MOCK_AUTO_TRANSFERS,
      ),
    ).toBeNull()
  })
})
