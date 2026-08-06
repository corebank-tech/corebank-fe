import type { AccountOption } from "@/shared/types/account"

/** 계좌상태. 정상 계좌만 출금가능금액이 계좌잔액과 동일하다(REQ-INQR-008). */
export type AccountStatus = "정상" | "거래정지" | "해지"

/**
 * B-03 거래내역조회 상단 계좌상세정보(REQ-INQR-007)에 필요한 필드를 더한 계좌 정보.
 * AccountOption을 확장하므로 AccountSelectField 등 기존 소비처에는 그대로 전달할 수 있다.
 */
export type TransactionAccount = AccountOption & {
  /** 예금주명(REQ-INQR-007). 화면 표시 시 가운데 1자를 마스킹한다(REQ-CMN-018). */
  ownerName: string
  /** 신규일자 ISO date. */
  openedDate: string
  status: AccountStatus
}

export type Transaction = {
  id: string
  /** 거래일자 ISO date (YYYY-MM-DD). */
  date: string
  /** 거래시각 (HH:mm:ss). */
  time: string
  /** 적요(거래유형). 자동이체 실행 건은 반드시 '자동이체'로 표시한다(REQ-INQR-011). */
  description: string
  /** 거래내용(통장 표시내용). */
  content: string
  withdraw: number
  deposit: number
  balance: number
  /** 거래채널. 예: 인터넷뱅킹 / 자동이체 / 예약이체 / 영업점 / ATM. */
  channel: string
}

export const MOCK_ACCOUNTS: TransactionAccount[] = [
  {
    alias: "자유입출금",
    accountNo: "110632892336",
    balance: 12340500,
    withdrawable: 12000000,
    ownerName: "김민준",
    openedDate: "2021-03-14",
    status: "정상",
  },
  {
    alias: "급여통장",
    accountNo: "302998112233",
    balance: 3860000,
    withdrawable: 3860000,
    ownerName: "김민준",
    openedDate: "2019-11-02",
    status: "정상",
  },
  {
    alias: "비상금통장",
    accountNo: "255104778910",
    balance: 1500000,
    withdrawable: 1500000,
    ownerName: "김민준",
    openedDate: "2023-06-20",
    status: "정상",
  },
]

/** 12 rows, most recent first, for account 110-632-892336. */
export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "t12",
    date: "2026-07-23",
    time: "08:41:02",
    description: "급여이체",
    content: "㈜코어테크",
    withdraw: 0,
    deposit: 2_850_000,
    balance: 12_340_500,
    channel: "영업점",
  },
  {
    id: "t11",
    date: "2026-07-22",
    time: "19:12:47",
    description: "카드출금",
    content: "BC카드",
    withdraw: 642_000,
    deposit: 0,
    balance: 9_490_500,
    channel: "인터넷뱅킹",
  },
  {
    id: "t10",
    date: "2026-07-21",
    time: "13:05:33",
    description: "자동이체",
    content: "한아름아파트관리",
    withdraw: 187_400,
    deposit: 0,
    balance: 10_132_500,
    channel: "자동이체",
  },
  {
    id: "t09",
    date: "2026-07-20",
    time: "11:48:10",
    description: "이자",
    content: "예금이자",
    withdraw: 0,
    deposit: 3_120,
    balance: 10_319_900,
    channel: "영업점",
  },
  {
    id: "t08",
    date: "2026-07-18",
    time: "09:26:55",
    description: "ATM출금",
    content: "ATM 현금인출",
    withdraw: 300_000,
    deposit: 0,
    balance: 10_316_780,
    channel: "ATM",
  },
  {
    id: "t07",
    date: "2026-07-16",
    time: "20:02:14",
    description: "자동이체",
    content: "SK텔레콤",
    withdraw: 55_900,
    deposit: 0,
    balance: 10_616_780,
    channel: "자동이체",
  },
  {
    id: "t06",
    date: "2026-07-14",
    time: "15:33:41",
    description: "이체입금",
    content: "김민수",
    withdraw: 0,
    deposit: 500_000,
    balance: 10_672_680,
    channel: "인터넷뱅킹",
  },
  {
    id: "t05",
    date: "2026-07-11",
    time: "10:17:08",
    description: "자동이체",
    content: "한화생명보험",
    withdraw: 128_000,
    deposit: 0,
    balance: 10_172_680,
    channel: "자동이체",
  },
  {
    id: "t04",
    date: "2026-07-08",
    time: "18:44:29",
    description: "카드출금",
    content: "쿠팡",
    withdraw: 94_300,
    deposit: 0,
    balance: 10_300_680,
    channel: "인터넷뱅킹",
  },
  {
    id: "t03",
    date: "2026-07-05",
    time: "12:00:00",
    description: "자동이체",
    content: "내집마련적금",
    withdraw: 500_000,
    deposit: 0,
    balance: 10_394_980,
    channel: "자동이체",
  },
  {
    id: "t02",
    date: "2026-07-02",
    time: "09:10:52",
    description: "이체입금",
    content: "이서연",
    withdraw: 0,
    deposit: 1_200_000,
    balance: 10_894_980,
    channel: "예약이체",
  },
  {
    id: "t01",
    date: "2026-06-30",
    time: "08:05:00",
    description: "이자",
    content: "예금이자",
    withdraw: 0,
    deposit: 2_540,
    balance: 9_694_980,
    channel: "영업점",
  },
]
