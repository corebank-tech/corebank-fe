import { describe, expect, it } from "vitest"
import { MOCK_AUTO_TRANSFERS, MOCK_RESERVATIONS } from "@/entities/transfer"
import { MOCK_WITHDRAWAL_ACCOUNTS } from "@/entities/account"
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

  it("등록된 출금계좌에 차단되는 계좌와 차단되지 않는 계좌가 둘 다 있다", () => {
    // 차단 여부는 다른 파일(예약이체·자동이체 목업)의 계좌번호와 상태에 달려 있다.
    // 한쪽 목업만 손대면 B-05가 전부 차단되거나 전부 삭제 가능해져서, 화면에서
    // 확인할 수 있는 경우가 한 갈래만 남는다.
    const reasons = MOCK_WITHDRAWAL_ACCOUNTS.filter((a) => a.registered).map(
      (a) =>
        getWithdrawalDeleteBlockReason(
          a.accountNo,
          MOCK_RESERVATIONS,
          MOCK_AUTO_TRANSFERS,
        ),
    )

    expect(reasons.some((reason) => reason != null)).toBe(true)
    expect(reasons.some((reason) => reason == null)).toBe(true)
  })
})
