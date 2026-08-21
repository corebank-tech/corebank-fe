import { describe, it, expect } from "vitest"
import { checkPeriodRange } from "@/entities/transaction"

const TODAY = "2026-08-21"
const MAX = 365

describe("checkPeriodRange", () => {
  it("최근 1개월 창은 통과한다", () => {
    expect(checkPeriodRange("2026-07-21", TODAY, TODAY, MAX)).toEqual({
      reversed: false,
      overLimit: false,
    })
  })

  it("종료일이 시작일보다 빠르면 reversed다", () => {
    expect(checkPeriodRange(TODAY, "2026-07-21", TODAY, MAX).reversed).toBe(
      true,
    )
  })

  it("한도는 기간 폭이 아니라 시작일 기준이다", () => {
    // 폭은 364일이라 폭 기준으로는 통과하지만, 시작일이 7년 넘게 과거다.
    expect(
      checkPeriodRange("2019-01-01", "2019-12-31", TODAY, MAX).overLimit,
    ).toBe(true)
  })

  it("시작일이 정확히 한도 경계면 통과하고, 하루 더 과거면 걸린다", () => {
    expect(checkPeriodRange("2025-08-21", TODAY, TODAY, MAX).overLimit).toBe(
      false,
    )
    expect(checkPeriodRange("2025-08-20", TODAY, TODAY, MAX).overLimit).toBe(
      true,
    )
  })

  it("종료일이 미래여도 시작일만 한도 안이면 통과한다 (E-04 예약이체 조회)", () => {
    expect(checkPeriodRange("2026-06-21", "2026-10-21", TODAY, MAX)).toEqual({
      reversed: false,
      overLimit: false,
    })
  })
})
