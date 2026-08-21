/**
 * G-05 자동이체결과 조회. REQ-AUTO-018·019.
 * 회차 처리결과는 이체 처리상태 코드(정상/오류)를 그대로 사용한다.
 *
 * '처리중'은 요구사항의 결과 코드에는 없지만 서버가 PROCESSING을 내려준다 —
 * 배치가 실행 중인 짧은 순간의 상태다. 정상·오류 중 하나로 뭉개면 확정되지 않은
 * 회차를 확정된 것처럼 보여주게 되어 그대로 노출한다.
 */

export type AutoTransferResult = "정상" | "오류" | "처리중"

export type AutoTransferResultRow = {
  id: string
  result: AutoTransferResult
  /** 처리일시 ISO datetime. */
  processedAt: string
  fromAccountNo: string
  fromAlias: string
  toAccountNo: string
  payeeName: string
  amount: number
  cycleMonths: 1 | 3 | 6
  memo: string
  failReason?: string
}
