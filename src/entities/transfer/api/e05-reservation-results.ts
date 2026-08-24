/**
 * E-05 예약이체 처리결과 조회. REQ-RSV-014.
 *
 * '처리중'은 요구사항의 결과 코드에는 없다. 서버는 확정된 건(SUCCESS/FAILED/CANCELED)만
 * 내려주지만 status enum 자체는 WAITING·PROCESSING까지 포함하고 있어, 모르는 값이 오면
 * 정상·오류·취소 중 하나로 뭉개는 대신 여기로 떨어뜨린다 — 확정되지 않은 건을 확정된
 * 것처럼 보여주지 않기 위해서다. G-05(AutoTransferResult)와 같은 처리다.
 */

export type ReservationResult = "정상" | "오류" | "취소" | "처리중"

export type ReservationResultRow = {
  id: string
  result: ReservationResult
  /**
   * 처리 확정 시각 ISO datetime. 정상·오류는 실행 시각, 취소는 취소 시각이다 —
   * 서버가 목록을 정렬하는 기준과 같은 값이다.
   */
  transferDate: string
  /** 서버가 마스킹해서 내려준다(예: `110******877`). 화면에서 다시 가공하지 않는다. */
  fromAccountNo: string
  /** 서버가 마스킹해서 내려준다. */
  toAccountNo: string
  /** 서버가 마스킹해서 내려준다(예: `홍*동`). */
  payeeName: string
  amount: number
  /** 정상·오류 건에만 존재. */
  txId?: string
  failReason?: string
}
