/**
 * E-04 예약이체 조회/취소. REQ-RSV-007·008.
 * 상태는 대기/완료/실패/취소 4종(POL-025 이체 처리상태와 별개 체계)이다.
 */

export type ReservationStatus = "대기" | "완료" | "실패" | "취소"

export type ReservationRow = {
  id: string
  status: ReservationStatus
  /** 이체 예정일자 ISO date. */
  scheduledDate: string
  /** 등록일시 ISO datetime. */
  registeredAt?: string
  /** 서버가 마스킹해서 내려준다(예: `110******877`). 화면에서 다시 가공하지 않는다. */
  fromAccountNo: string
  /** 출금계좌 별칭. 서버가 미설정 건에는 내려주지 않는다 — 화면은 빈 문자열도 미설정으로 본다. */
  fromAlias?: string
  /** 서버가 마스킹해서 내려준다. */
  toAccountNo: string
  /** 서버가 마스킹해서 내려준다(예: `홍*동`). */
  payeeName: string
  amount: number
  /** 내 통장 표시내용. 서버가 미입력 건에는 내려주지 않는다 — 화면은 빈 문자열도 미입력으로 본다. */
  memo?: string
  /** 취소 가능 여부. 서버가 REQ-RSV-008 규칙(예정일 전일까지)을 적용해 계산해 준다. */
  cancelable: boolean
}
