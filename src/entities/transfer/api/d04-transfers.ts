/**
 * D-04 이체결과조회. REQ-TRSF-021·022·023·032·033.
 * 처리상태는 POL-025의 3종(정상/오류/처리중)만 사용한다.
 */

export type TransferStatus = "정상" | "오류" | "처리중"

/** 목록 한 건. 출금계좌는 조회조건으로 고른 계좌 하나뿐이라 서버가 행마다 내려주지 않는다. */
export type TransferHistoryRow = {
  /** 거래번호: YYYYMMDD + 채널코드(2) + 일련번호(10), REQ-TRSF-028 */
  txId: string
  status: TransferStatus
  /** ISO datetime. */
  datetime: string
  /** 입금계좌. 서버가 마스킹해서 내려준다. 화면에서 다시 가공하지 않는다. */
  toAccountNo: string
  /** 서버가 마스킹해서 내려준다(예: `홍*동`). */
  payeeName: string
  amount: number
  /** 오류 건에만 존재. */
  failureReason?: string
}

/** REQ-TRSF-023: 목록의 거래번호를 누르면 여는 상세. 목록에 없는 항목만 더 담는다. */
export type TransferHistoryDetail = TransferHistoryRow & {
  fee: number
  /** 받는 분 통장에 찍히는 표시내용. */
  memo: string
  /** REQ-TRSF-023: 실패 건은 오류사유와 함께 오류코드도 확인할 수 있어야 한다. */
  errorCode?: string
}

/** REQ-TRSF-033: 전월 기준 최근 1년 이내 월별·출금계좌별 통계(권장 기능). */
export type MonthlyTransferStat = {
  month: string
  fromAlias: string
  count: number
  amount: number
}

/** 월별 이체통계는 대응하는 서버 엔드포인트가 없어 목업으로 남는다. */
export const MOCK_MONTHLY_TRANSFER_STATS: MonthlyTransferStat[] = [
  { month: "2026-06", fromAlias: "자유입출금", count: 1, amount: 45_000 },
  { month: "2026-06", fromAlias: "급여통장", count: 1, amount: 800_000 },
  { month: "2026-05", fromAlias: "급여통장", count: 1, amount: 2_000_000 },
  { month: "2026-05", fromAlias: "자유입출금", count: 1, amount: 30_000 },
  { month: "2026-04", fromAlias: "자유입출금", count: 1, amount: 500_000 },
  { month: "2026-04", fromAlias: "급여통장", count: 1, amount: 90_000 },
  { month: "2026-04", fromAlias: "비상금통장", count: 1, amount: 200_000 },
]
