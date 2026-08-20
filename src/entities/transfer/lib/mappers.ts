import type { ScheduledTransferListItemResponse } from "@/shared/api/generated/model"
import type {
  ReservationRow,
  ReservationStatus,
} from "@/entities/transfer/api/e04-reservations"

const RESERVATION_STATUS_MAP: Record<string, ReservationStatus> = {
  WAITING: "대기",
  // 야간배치가 실행 중인 짧은 순간의 상태라 화면에서는 대기와 구분하지 않는다.
  PROCESSING: "대기",
  SUCCESS: "완료",
  FAILED: "실패",
  CANCELED: "취소",
}

/** 예약이체 조회(E-04) 응답 한 건을 화면 표시용 타입으로 변환한다. */
export const toReservationRow = (
  item: ScheduledTransferListItemResponse,
): ReservationRow => ({
  id: String(item.scheduledTransferId ?? ""),
  status: RESERVATION_STATUS_MAP[item.status ?? "WAITING"],
  scheduledDate: item.scheduledDate ?? "",
  fromAccountNo: item.withdrawalAccountNumber ?? "",
  toAccountNo: item.accountNumber ?? "",
  payeeName: item.payeeName ?? "",
  amount: item.amount ?? 0,
  cancelable: item.cancelable ?? false,
})
