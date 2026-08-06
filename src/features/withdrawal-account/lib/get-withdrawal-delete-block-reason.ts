import type { AutoTransferRow, ReservationRow } from "@/entities/transfer"

/**
 * REQ-ACCT-011: 대기 상태 예약이체 또는 정상 상태 자동이체가 등록된 계좌는 삭제할 수 없다.
 * 차단 사유가 없으면 null을 반환한다.
 */
export const getWithdrawalDeleteBlockReason = (
  accountNo: string,
  reservations: readonly ReservationRow[],
  autoTransfers: readonly AutoTransferRow[],
): string | null => {
  const hasPendingReservation = reservations.some(
    (r) => r.fromAccountNo === accountNo && r.status === "대기",
  )
  if (hasPendingReservation) {
    return "대기 상태의 예약이체가 등록되어 있어 삭제할 수 없습니다."
  }
  const hasActiveAutoTransfer = autoTransfers.some(
    (a) => a.fromAccountNo === accountNo && a.status === "정상",
  )
  if (hasActiveAutoTransfer) {
    return "정상 상태의 자동이체가 등록되어 있어 삭제할 수 없습니다."
  }
  return null
}
