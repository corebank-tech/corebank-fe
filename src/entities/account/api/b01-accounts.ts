import { daysAgo, daysAhead } from "@/shared/lib/mock-date"

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

/**
 * 예적금 계좌는 개설일과 만기일을 함께 상대값으로 둔다 — 만기일만 상대값으로
 * 바꾸면 시간이 지날수록 가입기간이 벌어져서, B-01 그리드의 같은 행에 나란히
 * 뜨는 신규일자·만기일이 "정기예금 1년"인데 1년이 아니게 된다.
 */
export const MOCK_OVERVIEW_ACCOUNTS: OverviewAccount[] = [
  {
    id: "acc-1",
    group: "checking",
    alias: "자유입출금",
    accountNo: "110632892336",
    openedDate: "2021-03-14",
    lastActivityDate: daysAgo(0),
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
    lastActivityDate: daysAgo(1),
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
    lastActivityDate: daysAgo(5),
    isMaturityDate: false,
    balance: 1_500_000,
    isWithdrawalAccount: true,
  },
  {
    id: "acc-4",
    group: "deposit",
    alias: "정기예금 1년",
    accountNo: "110550051877",
    openedDate: daysAgo(223),
    lastActivityDate: daysAhead(142),
    isMaturityDate: true,
    balance: 10_000_000,
    isWithdrawalAccount: false,
  },
  {
    id: "acc-5",
    group: "deposit",
    alias: "내집마련적금",
    accountNo: "110220093412",
    openedDate: daysAgo(354),
    lastActivityDate: daysAhead(192),
    isMaturityDate: true,
    balance: 3_600_000,
    isWithdrawalAccount: false,
  },
  {
    id: "acc-6",
    group: "deposit",
    alias: "여행적금",
    accountNo: "110770164529",
    openedDate: daysAgo(138),
    lastActivityDate: daysAhead(45),
    isMaturityDate: true,
    balance: 900_000,
    isWithdrawalAccount: false,
  },
]
