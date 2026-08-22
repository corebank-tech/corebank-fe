import { describe, it, expect } from "vitest"
import { MOCK_TRANSACTIONS } from "@/entities/transaction"
import { recentPeriod } from "@/shared/config/query-period"
import { getToday } from "@/shared/config/clock"
import { addDays } from "@/shared/lib/date"

const newestDate = (dates: string[]) =>
  dates.reduce((a, d) => (d > a ? d : a), "")

describe("MOCK_TRANSACTIONS", () => {
  it("최신 건이 D-7 이내다", () => {
    // 고정 날짜를 박으면 이 단언이 일주일 뒤부터 깨진다. 기본 조회기간(1개월)
    // 안에 아직 남아 있는 동안 실패해야 빈 목록이 되기 전에 잡을 수 있다.
    const newest = newestDate(MOCK_TRANSACTIONS.map((t) => t.date))
    expect(newest >= addDays(getToday(), -7)).toBe(true)
  })

  it("기본 조회기간(POL-021, 1개월)에 최소 3건이 들어온다", () => {
    const { start, end } = recentPeriod()
    const visible = MOCK_TRANSACTIONS.filter(
      (t) => t.date >= start && t.date <= end,
    )
    expect(visible.length).toBeGreaterThanOrEqual(3)
  })

  it("미래 일자 거래는 없다", () => {
    expect(MOCK_TRANSACTIONS.every((t) => t.date <= getToday())).toBe(true)
  })
})
