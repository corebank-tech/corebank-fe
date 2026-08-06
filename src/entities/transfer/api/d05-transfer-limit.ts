/** D-05 이체한도 조회/변경 mock 데이터. */

export type TransferLimitState = {
  /** 1회 이체한도(KRW) */
  perTransferLimit: number
  /** 1일 이체한도(KRW) */
  perDayLimit: number
  /** 당일 누적 사용금액(KRW) */
  usedToday: number
}

export const MOCK_TRANSFER_LIMIT: TransferLimitState = {
  perTransferLimit: 5_000_000,
  perDayLimit: 20_000_000,
  usedToday: 3_450_000,
}
