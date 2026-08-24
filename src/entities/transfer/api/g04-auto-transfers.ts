/**
 * G-04 자동이체 조회/변경/해지의 도메인 타입. REQ-AUTO-009·010·011.
 * 등록 상태는 POL-036의 3종(정상/종료/해지)만 사용한다 — POL-025 이체 처리상태와 혼동하지 말 것.
 */

export type AutoTransferStatus = "정상" | "종료" | "해지"
export type TransferCycle = 1 | 3 | 6

export type AutoTransferRow = {
  id: string
  fromAccountNo: string
  /** 출금계좌 별칭. 서버가 미설정 건에는 내려주지 않는다 — 화면은 빈 문자열도 미설정으로 본다. */
  fromAlias?: string
  toAccountNo: string
  payeeName: string
  amount: number
  cycleMonths: TransferCycle
  /** 이체지정일 1~31 */
  dayOfMonth: number
  /** 이체 시작일 ISO date */
  startDate: string
  /** 이체 종료일 ISO date */
  endDate: string
  memo: string
  status: AutoTransferStatus
  /** 상태가 '정상'인 건만 존재. */
  nextExecDate?: string
  /** REQ-AUTO-011: 서버가 판정한 해지 가능 여부. 다음 실행 예정일 당일이면 false다. */
  cancelable: boolean
}
