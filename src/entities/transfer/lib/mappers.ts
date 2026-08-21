import type {
  AutoTransferListItemResponse,
  ScheduledTransferListItemResponse,
} from "@/shared/api/generated/model"
import type {
  ReservationRow,
  ReservationStatus,
} from "@/entities/transfer/api/e04-reservations"
import type {
  AutoTransferRow,
  AutoTransferStatus,
  TransferCycle,
} from "@/entities/transfer/api/g04-auto-transfers"

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
  registeredAt: item.registeredAt,
  fromAccountNo: item.withdrawalAccountNumber ?? "",
  fromAlias: item.fromAlias,
  toAccountNo: item.accountNumber ?? "",
  payeeName: item.payeeName ?? "",
  amount: item.amount ?? 0,
  memo: item.myPassbookMemo,
  cancelable: item.cancelable ?? false,
})

/**
 * status는 스펙상 NORMAL|EXPIRED|TERMINATED 뿐이지만, Record 인덱싱은 모르는 값에
 * undefined를 돌려줘 뱃지가 빈칸으로 렌더된다. 콘솔에 남기고 '종료'로 폴백한다 —
 * '정상'으로 폴백하면 상태를 모르는 건에 변경·해지 버튼이 열려버린다.
 */
const AUTO_TRANSFER_STATUS_MAP: Record<string, AutoTransferStatus> = {
  NORMAL: "정상",
  EXPIRED: "종료",
  TERMINATED: "해지",
}

const toAutoTransferStatus = (
  status: string | undefined,
): AutoTransferStatus => {
  const mapped = status ? AUTO_TRANSFER_STATUS_MAP[status] : undefined
  if (mapped) return mapped
  console.error(`[entities/transfer] 알 수 없는 자동이체 상태: ${status}`)
  return "종료"
}

/** 이체주기는 POL-035상 1·3·6개월 3종뿐이다. */
const toTransferCycle = (cycleMonths: number | undefined): TransferCycle => {
  if (cycleMonths === 1 || cycleMonths === 3 || cycleMonths === 6) {
    return cycleMonths
  }
  console.error(`[entities/transfer] 알 수 없는 이체주기: ${cycleMonths}`)
  return 1
}

/**
 * 자동이체 조회(G-04) 응답 한 건을 화면 표시용 타입으로 변환한다.
 *
 * 출금계좌번호는 응답에 없다 — 조회 조건(withdrawalAccountId)으로 지정한 계좌라
 * 호출부가 이미 알고 있는 값이고, 그대로 넘겨받는다.
 *
 * nextExecDate도 응답에 없어 비워 둔다. 해지 가능 시점(REQ-AUTO-011) 판정에 쓰이는
 * 값이라, 서버가 내려주기 전까지 화면에서 사전 차단할 수 없다.
 */
export const toAutoTransferRow = (
  item: AutoTransferListItemResponse,
  fromAccountNo: string,
): AutoTransferRow => ({
  id: String(item.autoTransferId ?? ""),
  fromAccountNo,
  fromAlias: item.fromAlias ?? "",
  toAccountNo: item.depositAccountNumber ?? "",
  payeeName: item.payeeName ?? "",
  amount: item.amount ?? 0,
  cycleMonths: toTransferCycle(item.cycleMonths),
  dayOfMonth: item.transferDay ?? 1,
  startDate: item.startDate ?? "",
  endDate: item.endDate ?? "",
  memo: item.myPassbookMemo ?? "",
  status: toAutoTransferStatus(item.status),
})
