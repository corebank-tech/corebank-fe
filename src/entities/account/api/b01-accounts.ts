/**
 * B-01 전체계좌조회 / B-02 예금·적금 계좌조회 공용 목업 데이터.
 * REQ-INQR-001~006. 상품군 그룹(입출금계좌 / 예금·적금계좌) 단위로 구분한다.
 */

export type AccountGroupId = "checking" | "deposit"

export type OverviewAccount = {
  id: string
  group: AccountGroupId
  /** 계좌명(별명 우선, REQ-INQR-004) */
  alias: string
  /** 12자리 원본 계좌번호 */
  accountNo: string
  /** 신규일 ISO date */
  openedDate: string
  /** 최근거래일(입출금) 또는 만기일(예적금) ISO date */
  lastActivityDate: string
  /** 예적금 계좌 여부. true면 lastActivityDate가 만기일이다. */
  isMaturityDate: boolean
  balance: number
  /** 출금계좌로 등록된 입출금계좌만 [이체] 바로가기를 노출한다 (REQ-INQR-005). */
  isWithdrawalAccount: boolean
}

export const MOCK_OVERVIEW_ACCOUNTS: OverviewAccount[] = [
  {
    id: "acc-1",
    group: "checking",
    alias: "자유입출금",
    accountNo: "110632892336",
    openedDate: "2021-03-14",
    lastActivityDate: "2026-07-23",
    isMaturityDate: false,
    balance: 12_340_500,
    isWithdrawalAccount: true,
  },
  {
    id: "acc-2",
    group: "checking",
    alias: "급여통장",
    accountNo: "302998112233",
    openedDate: "2019-11-02",
    lastActivityDate: "2026-07-22",
    isMaturityDate: false,
    balance: 3_860_000,
    isWithdrawalAccount: true,
  },
  {
    id: "acc-3",
    group: "checking",
    alias: "비상금통장",
    accountNo: "255104778910",
    openedDate: "2023-06-20",
    lastActivityDate: "2026-07-18",
    isMaturityDate: false,
    balance: 1_500_000,
    isWithdrawalAccount: true,
  },
  {
    id: "acc-4",
    group: "deposit",
    alias: "정기예금 1년",
    accountNo: "110550051877",
    openedDate: "2026-01-10",
    lastActivityDate: "2027-01-10",
    isMaturityDate: true,
    balance: 10_000_000,
    isWithdrawalAccount: false,
  },
  {
    id: "acc-5",
    group: "deposit",
    alias: "내집마련적금",
    accountNo: "110220093412",
    openedDate: "2025-09-01",
    lastActivityDate: "2027-03-01",
    isMaturityDate: true,
    balance: 3_600_000,
    isWithdrawalAccount: false,
  },
  {
    id: "acc-6",
    group: "deposit",
    alias: "여행적금",
    accountNo: "110770164529",
    openedDate: "2026-04-05",
    lastActivityDate: "2026-10-05",
    isMaturityDate: true,
    balance: 900_000,
    isWithdrawalAccount: false,
  },
]
