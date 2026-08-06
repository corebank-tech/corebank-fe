/**
 * E-05 예약이체 처리결과 조회 목업 데이터. REQ-RSV-014.
 */

export type ReservationResult = "정상" | "오류" | "취소"

export type ReservationResultRow = {
  id: string
  result: ReservationResult
  /** 이체일자 ISO date. */
  transferDate: string
  fromAccountNo: string
  fromAlias: string
  toAccountNo: string
  payeeName: string
  amount: number
  /** 정상 처리 건에만 존재. */
  txId?: string
  failReason?: string
}

export const MOCK_RESERVATION_RESULTS: ReservationResultRow[] = [
  {
    id: "rr8",
    result: "정상",
    transferDate: "2026-07-15",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "333330730135",
    payeeName: "김민수",
    amount: 500_000,
    txId: "20260715019000001120",
  },
  {
    id: "rr7",
    result: "오류",
    transferDate: "2026-07-12",
    fromAccountNo: "255104778910",
    fromAlias: "비상금통장",
    toAccountNo: "999911223344",
    payeeName: "최유진",
    amount: 1_000_000,
    failReason: "출금계좌 잔액 부족(RSV0012)",
  },
  {
    id: "rr6",
    result: "취소",
    transferDate: "2026-07-10",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "444401122938",
    payeeName: "이서연",
    amount: 200_000,
  },
  {
    id: "rr5",
    result: "정상",
    transferDate: "2026-06-30",
    fromAccountNo: "302998112233",
    fromAlias: "급여통장",
    toAccountNo: "110550098213",
    payeeName: "박지훈",
    amount: 2_000_000,
    txId: "20260630019000000940",
  },
  {
    id: "rr4",
    result: "정상",
    transferDate: "2026-06-18",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "333330730135",
    payeeName: "김민수",
    amount: 300_000,
    txId: "20260618019000000801",
  },
  {
    id: "rr3",
    result: "오류",
    transferDate: "2026-06-05",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "110550098213",
    payeeName: "박지훈",
    amount: 5_000_000,
    failReason: "1일 이체한도 초과(RSV0021)",
  },
  {
    id: "rr2",
    result: "정상",
    transferDate: "2026-05-22",
    fromAccountNo: "302998112233",
    fromAlias: "급여통장",
    toAccountNo: "444401122938",
    payeeName: "이서연",
    amount: 90_000,
    txId: "20260522019000000410",
  },
  {
    id: "rr1",
    result: "정상",
    transferDate: "2026-04-30",
    fromAccountNo: "255104778910",
    fromAlias: "비상금통장",
    toAccountNo: "110632892336",
    payeeName: "홍길동",
    amount: 200_000,
    txId: "20260430019000000052",
  },
]
