/** Dashboard presentation mock data. KRW single currency, Asia/Seoul. */

export type DashboardAccount = {
  id: string
  /** 계좌명 (별칭 + 상품명 구분용) */
  alias: string
  /** 12-digit raw account number. */
  accountNo: string
  /** 신규일 ISO date. */
  openedDate: string
  /** 최근거래일 ISO date. */
  lastTxDate: string
  balance: number
}

export type AccessStatus = {
  /** 최근 접속일시 ISO datetime. */
  lastLogin: string
  /** 현재 접속 IP. */
  ip: string
  /** 최근 거래일시 ISO datetime. */
  lastTransaction: string
}

export type NotificationCategory = "이체" | "출금" | "안내"

export type NotificationItem = {
  id: string
  category: NotificationCategory
  title: string
  /** ISO datetime. */
  datetime: string
}

/** 대표계좌 요약에 표시할 계좌 목록. */
export const MOCK_DASHBOARD_ACCOUNTS: DashboardAccount[] = [
  {
    id: "acc-1",
    alias: "자유입출금",
    accountNo: "110632892336",
    openedDate: "2021-03-14",
    lastTxDate: "2026-07-23",
    balance: 12_340_500,
  },
  {
    id: "acc-2",
    alias: "급여통장",
    accountNo: "302998112233",
    openedDate: "2019-11-02",
    lastTxDate: "2026-07-22",
    balance: 3_860_000,
  },
  {
    id: "acc-3",
    alias: "비상금통장",
    accountNo: "255104778910",
    openedDate: "2023-06-20",
    lastTxDate: "2026-07-18",
    balance: 1_500_000,
  },
]

export const MOCK_ACCESS_STATUS: AccessStatus = {
  lastLogin: "2026-07-23T08:57:34",
  ip: "203.245.11.87",
  lastTransaction: "2026-07-23T08:41:02",
}

/** 미읽음 알림 3건. */
export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    category: "이체",
    title: "예약이체 1건이 정상 처리되었습니다.",
    datetime: "2026-07-23T09:12:40",
  },
  {
    id: "n2",
    category: "출금",
    title: "카드대금 642,000원이 출금되었습니다.",
    datetime: "2026-07-22T19:12:47",
  },
  {
    id: "n3",
    category: "안내",
    title: "이체한도 상향 신청 결과가 도착했습니다.",
    datetime: "2026-07-22T14:03:15",
  },
]
