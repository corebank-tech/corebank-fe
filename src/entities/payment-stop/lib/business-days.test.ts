import { describe, expect, it } from "vitest"
import {
  addBusinessDays,
  businessDaysUntil,
} from "@/entities/payment-stop/lib/business-days"

describe("business-days", () => {
  it("금요일에 5영업일을 더하면 다음 주 금요일이다", () => {
    expect(addBusinessDays("2026-11-06", 5)).toBe("2026-11-13")
  })

  it("남은 평일을 세고, 지나면 음수로 준다", () => {
    // 2026-11-06 금 → 2026-11-10 화: 월, 화 2일
    expect(businessDaysUntil("2026-11-06", "2026-11-10")).toBe(2)
    expect(businessDaysUntil("2026-11-10", "2026-11-10")).toBe(0)
    expect(businessDaysUntil("2026-11-10", "2026-11-06")).toBe(-2)
  })
})
