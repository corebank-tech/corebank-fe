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
    expect(
      getWithdrawalDeleteBlockReason(
        "302998112233",
        MOCK_RESERVATIONS,
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

  it("등록된 출금계좌에서 REQ-ACCT-011의 두 차단 사유와 비차단이 모두 나온다", () => {
    // 차단 사유는 다른 파일(예약이체·자동이체 목업)의 계좌번호와 상태 조합으로 정해진다.
    // 예약이체를 먼저 판정하므로, 정상 자동이체가 걸린 계좌에 대기 예약이체까지 있으면
    // 자동이체 사유는 화면에 한 번도 표시되지 않는다 — "차단된다"만 단언하면 그 상태가
    // 그대로 통과한다.
    const reasons = MOCK_WITHDRAWAL_ACCOUNTS.filter((a) => a.registered).map(
      (a) =>
        getWithdrawalDeleteBlockReason(
          a.accountNo,
          MOCK_RESERVATIONS,
          MOCK_AUTO_TRANSFERS,
        ),
    )

    expect(reasons).toContain(
      "대기 상태의 예약이체가 등록되어 있어 삭제할 수 없습니다.",
    )
    expect(reasons).toContain(
      "정상 상태의 자동이체가 등록되어 있어 삭제할 수 없습니다.",
    )
    expect(reasons).toContain(null)
  })
})
