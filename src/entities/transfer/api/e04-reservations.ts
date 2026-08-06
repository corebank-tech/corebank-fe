/**
 * E-04 예약이체 조회/취소 목업 데이터. REQ-RSV-007·008.
 * 상태는 대기/완료/실패/취소 4종(POL-025 이체 처리상태와 별개 체계)이다.
 */

export type ReservationStatus = "대기" | "완료" | "실패" | "취소"

export type ReservationRow = {
  id: string
  status: ReservationStatus
  /** 이체 예정일자 ISO date. */
  scheduledDate: string
  /** 등록일시 ISO datetime. */
  registeredAt: string
  fromAccountNo: string
  fromAlias: string
  toAccountNo: string
  payeeName: string
  amount: number
  memo: string
}

/** 오늘 = 2026-07-23 기준 목업. */
export const MOCK_RESERVATIONS: ReservationRow[] = [
  {
    id: "rsv7",
    status: "대기",
    scheduledDate: "2026-07-24",
    registeredAt: "2026-07-20T10:12:00",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "333330730135",
    payeeName: "김민수",
    amount: 300_000,
    memo: "생활비",
  },
  {
    id: "rsv6",
    status: "대기",
    scheduledDate: "2026-07-25",
    registeredAt: "2026-07-19T09:30:00",
    fromAccountNo: "302998112233",
    fromAlias: "급여통장",
    toAccountNo: "110550098213",
    payeeName: "박지훈",
    amount: 2_000_000,
    memo: "월세",
  },
  {
    id: "rsv5",
    status: "대기",
    scheduledDate: "2026-08-01",
    registeredAt: "2026-07-18T14:05:00",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "444401122938",
    payeeName: "이서연",
    amount: 150_000,
    memo: "-",
  },
  {
    id: "rsv4",
    status: "완료",
    scheduledDate: "2026-07-15",
    registeredAt: "2026-07-10T11:00:00",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "333330730135",
    payeeName: "김민수",
    amount: 500_000,
    memo: "경조사비",
  },
  {
    id: "rsv3",
    status: "실패",
    scheduledDate: "2026-07-12",
    registeredAt: "2026-07-05T16:22:00",
    fromAccountNo: "255104778910",
    fromAlias: "비상금통장",
    toAccountNo: "999911223344",
    payeeName: "최유진",
    amount: 1_000_000,
    memo: "-",
  },
  {
    id: "rsv2",
    status: "취소",
    scheduledDate: "2026-07-10",
    registeredAt: "2026-07-01T08:45:00",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "444401122938",
    payeeName: "이서연",
    amount: 200_000,
    memo: "-",
  },
  {
    id: "rsv1",
    status: "완료",
    scheduledDate: "2026-06-30",
    registeredAt: "2026-06-25T13:10:00",
    fromAccountNo: "302998112233",
    fromAlias: "급여통장",
    toAccountNo: "110550098213",
    payeeName: "박지훈",
    amount: 2_000_000,
    memo: "월세",
  },
]
