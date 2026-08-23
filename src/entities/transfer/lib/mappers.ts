import type {
  AutoTransferExecutionHistoryItemResponse,
  AutoTransferListItemResponse,
  ScheduledTransferExecutionResultItemResponse,
  ScheduledTransferListItemResponse,
} from "@/shared/api/generated"
import type {
  ReservationRow,
  ReservationStatus,
} from "@/entities/transfer/api/e04-reservations"
import type {
  ReservationResult,
  ReservationResultRow,
} from "@/entities/transfer/api/e05-reservation-results"
import type {
  AutoTransferRow,
  AutoTransferStatus,
  TransferCycle,
} from "@/entities/transfer/api/g04-auto-transfers"
import type {
  AutoTransferResult,
  AutoTransferResultRow,
} from "@/entities/transfer/api/g05-auto-transfer-results"

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

const RESERVATION_RESULT_MAP: Record<string, ReservationResult> = {
  SUCCESS: "정상",
  FAILED: "오류",
  CANCELED: "취소",
}

const toReservationResult = (status: string | undefined): ReservationResult => {
  const mapped = status ? RESERVATION_RESULT_MAP[status] : undefined
  if (mapped) return mapped
  console.error(`[entities/transfer] 알 수 없는 예약이체 처리결과: ${status}`)
  return "처리중"
}

/**
 * 예약이체 처리결과 조회(E-05) 응답 한 건을 화면 표시용 타입으로 변환한다.
 *
 * 계좌번호·예금주명은 서버가 이미 마스킹해서 내려준다. 화면에서 다시 가공하면
 * 마스킹 문자가 깎여 나가므로 받은 값을 그대로 옮긴다.
 */
export const toReservationResultRow = (
  item: ScheduledTransferExecutionResultItemResponse,
): ReservationResultRow => ({
  id: String(item.scheduledTransferId ?? ""),
  result: toReservationResult(item.status),
  // 정상·오류는 실행 시각, 취소는 취소 시각이 채워진다. 서버가 목록을 정렬하는
  // 기준도 이 둘의 COALESCE라 같은 값을 쓴다.
  transferDate: item.executedAt ?? item.canceledAt ?? "",
  fromAccountNo: item.withdrawalAccountNumber ?? "",
  toAccountNo: item.accountNumber ?? "",
  payeeName: item.payeeName ?? "",
  amount: item.amount ?? 0,
  txId: item.transactionNumber ?? undefined,
  failReason: item.failureReason ?? undefined,
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
  cancelable: item.cancelable ?? false,
})

const AUTO_TRANSFER_RESULT_MAP: Record<string, AutoTransferResult> = {
  SUCCESS: "정상",
  ERROR: "오류",
  // 배치가 실행 중인 짧은 순간의 상태. 정상·오류 중 하나로 뭉개면 확정되지 않은
  // 회차를 확정된 것처럼 보여주게 된다.
  PROCESSING: "처리중",
}

const toAutoTransferResult = (
  status: string | undefined,
): AutoTransferResult => {
  const mapped = status ? AUTO_TRANSFER_RESULT_MAP[status] : undefined
  if (mapped) return mapped
  console.error(`[entities/transfer] 알 수 없는 자동이체 실행결과: ${status}`)
  return "처리중"
}

/**
 * 자동이체결과 조회(G-05) 응답 한 건을 화면 표시용 타입으로 변환한다.
 *
 * 출금계좌번호·별칭은 응답에 없다(withdrawalAccountId만 온다). 조회 조건으로
 * 지정한 계좌라 호출부가 이미 아는 값이고, 그대로 넘겨받는다.
 */
export const toAutoTransferResultRow = (
  item: AutoTransferExecutionHistoryItemResponse,
  fromAccount: { accountNo: string; alias: string },
): AutoTransferResultRow => ({
  id: String(item.executionId ?? ""),
  result: toAutoTransferResult(item.status),
  processedAt: item.executedAt ?? "",
  fromAccountNo: fromAccount.accountNo,
  fromAlias: fromAccount.alias,
  toAccountNo: item.depositAccountNumber ?? "",
  payeeName: item.payeeName ?? "",
  amount: item.amount ?? 0,
  cycleMonths: toTransferCycle(item.cycleMonths),
  memo: item.myPassbookMemo ?? "",
  failReason: item.failureReason ?? undefined,
})
