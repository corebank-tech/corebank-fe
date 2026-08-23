import { describe, it, expect } from "vitest"
import { MOCK_OVERVIEW_ACCOUNTS, MOCK_ORDER_ACCOUNTS } from "@/entities/account"
import { MOCK_DASHBOARD_ACCOUNTS } from "@/entities/dashboard"
import { daysBetween } from "@/shared/lib/date"

/**
 * 같은 계좌를 여러 mock 파일이 각자 들고 있으므로
 * B-01(전체계좌조회)을 기준으로 B-07·대시보드 mock의 정합성을 검증한다.
 */
const overviewByAccountNo = new Map(
  MOCK_OVERVIEW_ACCOUNTS.map((a) => [a.accountNo, a]),
)

/** 신규일자 + 만기일 = 가입기간. B-01 그리드가 두 값을 같은 행에 보여준다. */
const TERM_DAYS: Record<string, number> = {
  "110550051877": 365, // 정기예금 1년
  "110220093412": 546, // 내집마련적금
  "110770164529": 183, // 여행적금
}

describe("MOCK_OVERVIEW_ACCOUNTS", () => {
  it("같은 계좌의 신규일자가 B-07·대시보드·B-03에서 모두 같다", () => {
    const others = [...MOCK_ORDER_ACCOUNTS, ...MOCK_DASHBOARD_ACCOUNTS]
    const mismatched = others.filter(
      (a) => overviewByAccountNo.get(a.accountNo)?.openedDate !== a.openedDate,
    )
    expect(mismatched).toEqual([])
  })

  it("입출금계좌의 최근거래일이 대시보드와 같다", () => {
    const mismatched = MOCK_DASHBOARD_ACCOUNTS.filter(
      (a) =>
        overviewByAccountNo.get(a.accountNo)?.lastActivityDate !== a.lastTxDate,
    )
    expect(mismatched).toEqual([])
  })

  it("예적금 계좌의 가입기간(신규일자~만기일)이 상품 기간과 맞는다", () => {
    // 만기일만 상대값으로 바꾸면 시간이 지날수록 "정기예금 1년"이 1년이 아니게 된다.
    const deposits = MOCK_OVERVIEW_ACCOUNTS.filter((a) => a.isMaturityDate)
    expect(deposits.map((a) => a.accountNo).sort()).toEqual(
      Object.keys(TERM_DAYS).sort(),
    )
    for (const a of deposits) {
      expect(daysBetween(a.openedDate, a.lastActivityDate)).toBe(
        TERM_DAYS[a.accountNo],
      )
    }
  })
})
