/**
 * D-04 이체결과조회 목업 데이터. REQ-TRSF-021·022·023·032·033.
 * 처리상태는 POL-025의 3종(정상/오류/처리중)만 사용한다.
 */

export type TransferStatus = "정상" | "오류" | "처리중"

export type TransferHistoryRow = {
  id: string
  /** ISO datetime. */
  datetime: string
  fromAccountNo: string
  fromAlias: string
  toAccountNo: string
  payeeName: string
  amount: number
  fee: number
  status: TransferStatus
  /** 거래번호: YYYYMMDD + 채널코드(2) + 일련번호(10), REQ-TRSF-028 */
  txId: string
  /** 받는 분 통장 표시내용 */
  memo: string
  errorReason?: string
}

export const MOCK_TRANSFER_HISTORY: TransferHistoryRow[] = [
  {
    id: "th14",
    datetime: "2026-07-23T08:41:02",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "333330730135",
    payeeName: "김민수",
    amount: 500_000,
    fee: 0,
    status: "정상",
    txId: "20260723019000001402",
    memo: "생활비",
  },
  {
    id: "th13",
    datetime: "2026-07-22T19:12:47",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "444401122938",
    payeeName: "이서연",
    amount: 120_000,
    fee: 0,
    status: "정상",
    txId: "20260722019000001398",
    memo: "회식비 정산",
  },
  {
    id: "th12",
    datetime: "2026-07-21T13:05:33",
    fromAccountNo: "302998112233",
    fromAlias: "급여통장",
    toAccountNo: "110550098213",
    payeeName: "박지훈",
    amount: 2_000_000,
    fee: 0,
    status: "오류",
    txId: "20260721019000001355",
    memo: "월세",
    errorReason: "출금계좌 잔액 부족(TRF0013)",
  },
  {
    id: "th11",
    datetime: "2026-07-20T11:48:10",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "255104778910",
    payeeName: "홍길동",
    amount: 300_000,
    fee: 0,
    status: "정상",
    txId: "20260720019000001290",
    memo: "비상금 이체",
  },
  {
    id: "th10",
    datetime: "2026-07-18T09:26:55",
    fromAccountNo: "255104778910",
    fromAlias: "비상금통장",
    toAccountNo: "110632892336",
    payeeName: "홍길동",
    amount: 1_000_000,
    fee: 0,
    status: "정상",
    txId: "20260718019000001180",
    memo: "-",
  },
  {
    id: "th09",
    datetime: "2026-07-16T20:02:14",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "999911223344",
    payeeName: "최유진",
    amount: 50_000,
    fee: 0,
    status: "처리중",
    txId: "20260716019000001077",
    memo: "축의금",
  },
  {
    id: "th08",
    datetime: "2026-06-28T15:33:41",
    fromAccountNo: "302998112233",
    fromAlias: "급여통장",
    toAccountNo: "333330730135",
    payeeName: "김민수",
    amount: 800_000,
    fee: 0,
    status: "정상",
    txId: "20260628019000000934",
    memo: "적금 추가납입",
  },
  {
    id: "th07",
    datetime: "2026-06-11T10:17:08",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "444401122938",
    payeeName: "이서연",
    amount: 45_000,
    fee: 0,
    status: "정상",
    txId: "20260611019000000711",
    memo: "밥값",
  },
  {
    id: "th06",
    datetime: "2026-06-05T12:00:00",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "110220093412",
    payeeName: "홍길동",
    amount: 500_000,
    fee: 0,
    status: "정상",
    txId: "20260605019000000602",
    memo: "적금 자동이체 보완",
  },
  {
    id: "th05",
    datetime: "2026-05-22T09:10:52",
    fromAccountNo: "302998112233",
    fromAlias: "급여통장",
    toAccountNo: "110550098213",
    payeeName: "박지훈",
    amount: 2_000_000,
    fee: 0,
    status: "오류",
    txId: "20260522019000000388",
    memo: "월세",
    errorReason: "1일 이체한도 초과(TRF0021)",
  },
  {
    id: "th04",
    datetime: "2026-05-08T18:44:29",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "999911223344",
    payeeName: "최유진",
    amount: 30_000,
    fee: 0,
    status: "정상",
    txId: "20260508019000000199",
    memo: "-",
  },
  {
    id: "th03",
    datetime: "2026-04-30T08:05:00",
    fromAccountNo: "255104778910",
    fromAlias: "비상금통장",
    toAccountNo: "110632892336",
    payeeName: "홍길동",
    amount: 200_000,
    fee: 0,
    status: "정상",
    txId: "20260430019000000052",
    memo: "-",
  },
  {
    id: "th02",
    datetime: "2026-04-14T14:02:31",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "333330730135",
    payeeName: "김민수",
    amount: 500_000,
    fee: 0,
    status: "정상",
    txId: "20260414019000000041",
    memo: "생활비",
  },
  {
    id: "th01",
    datetime: "2026-04-02T09:55:12",
    fromAccountNo: "302998112233",
    fromAlias: "급여통장",
    toAccountNo: "444401122938",
    payeeName: "이서연",
    amount: 90_000,
    fee: 0,
    status: "정상",
    txId: "20260402019000000018",
    memo: "-",
  },
]

/** REQ-TRSF-033: 전월 기준 최근 1년 이내 월별·출금계좌별 통계(권장 기능). */
export type MonthlyTransferStat = {
  month: string
  fromAlias: string
  count: number
  amount: number
}

export const MOCK_MONTHLY_TRANSFER_STATS: MonthlyTransferStat[] = [
  { month: "2026-06", fromAlias: "자유입출금", count: 1, amount: 45_000 },
  { month: "2026-06", fromAlias: "급여통장", count: 1, amount: 800_000 },
  { month: "2026-05", fromAlias: "급여통장", count: 1, amount: 2_000_000 },
  { month: "2026-05", fromAlias: "자유입출금", count: 1, amount: 30_000 },
  { month: "2026-04", fromAlias: "자유입출금", count: 1, amount: 500_000 },
  { month: "2026-04", fromAlias: "급여통장", count: 1, amount: 90_000 },
  { month: "2026-04", fromAlias: "비상금통장", count: 1, amount: 200_000 },
]
