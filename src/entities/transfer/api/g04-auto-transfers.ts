/**
 * G-04 자동이체 조회/변경/해지 목업 데이터. REQ-AUTO-009·010·011.
 * 등록 상태는 POL-036의 3종(정상/종료/해지)만 사용한다 — POL-025 이체 처리상태와 혼동하지 말 것.
 */

export type AutoTransferStatus = "정상" | "종료" | "해지"
export type TransferCycle = 1 | 3 | 6

export type AutoTransferRow = {
  id: string
  fromAccountNo: string
  fromAlias: string
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
}

/** 오늘 = 2026-07-23 기준 목업. */
export const MOCK_AUTO_TRANSFERS: AutoTransferRow[] = [
  {
    id: "at5",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "110220093412",
    payeeName: "홍길동",
    amount: 500_000,
    cycleMonths: 1,
    dayOfMonth: 5,
    startDate: "2025-09-05",
    endDate: "2027-08-05",
    memo: "내집마련적금",
    status: "정상",
    nextExecDate: "2026-08-05",
  },
  {
    id: "at4",
    fromAccountNo: "302998112233",
    fromAlias: "급여통장",
    toAccountNo: "110550098213",
    payeeName: "박지훈",
    amount: 187_400,
    cycleMonths: 1,
    dayOfMonth: 21,
    startDate: "2024-01-21",
    endDate: "2028-01-21",
    memo: "관리비",
    status: "정상",
    nextExecDate: "2026-08-21",
  },
  {
    id: "at3",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "110770164529",
    payeeName: "홍길동",
    amount: 300_000,
    cycleMonths: 1,
    dayOfMonth: 5,
    startDate: "2026-04-05",
    endDate: "2026-10-05",
    memo: "여행적금",
    status: "정상",
    nextExecDate: "2026-08-05",
  },
  {
    id: "at2",
    fromAccountNo: "255104778910",
    fromAlias: "비상금통장",
    toAccountNo: "999911223344",
    payeeName: "최유진",
    amount: 100_000,
    cycleMonths: 3,
    dayOfMonth: 15,
    startDate: "2023-01-15",
    endDate: "2026-01-15",
    memo: "부모님 용돈",
    status: "종료",
  },
  {
    id: "at1",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "444401122938",
    payeeName: "이서연",
    amount: 50_000,
    cycleMonths: 6,
    dayOfMonth: 1,
    startDate: "2024-06-01",
    endDate: "2027-06-01",
    memo: "동호회비",
    status: "해지",
  },
]
