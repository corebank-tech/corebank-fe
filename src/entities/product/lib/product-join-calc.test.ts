import { describe, expect, it } from "vitest"
import {
  addMonthsWithEomCorrection,
  estimateMaturityAmount,
} from "@/entities/product/lib/product-join-calc"

describe("addMonthsWithEomCorrection (REQ-PRDT-014)", () => {
  it("월말 보정 없이 개월 수를 더한다", () => {
    expect(addMonthsWithEomCorrection("2026-01-15", 6)).toBe("2026-07-15")
  })

  it("존재하지 않는 날짜는 대상 월의 말일로 보정한다 (1/31 + 1개월 -> 2월 말일)", () => {
    expect(addMonthsWithEomCorrection("2026-01-31", 1)).toBe("2026-02-28")
  })

  it("연도를 넘어가는 개월 수를 처리한다", () => {
    expect(addMonthsWithEomCorrection("2026-11-30", 3)).toBe("2027-02-28")
  })
})

describe("estimateMaturityAmount (REQ-PRDT-009)", () => {
  it("정기예금은 가입금액을 원금으로 세전 단리 계산한다", () => {
    const result = estimateMaturityAmount({
      category: "정기예금",
      amount: 10_000_000,
      termMonths: 12,
      annualRatePercent: 3,
    })
    expect(result).toBe(10_300_000)
  })

  it("정기적금은 월납입금액 x 가입기간을 원금으로 삼는다", () => {
    const result = estimateMaturityAmount({
      category: "정기적금",
      amount: 100_000,
      termMonths: 12,
      annualRatePercent: 3,
    })
    // principalBase = 100,000 * 12 = 1,200,000 / interest = 1,200,000 * 0.03 * 1 = 36,000
    expect(result).toBe(1_236_000)
  })
})
