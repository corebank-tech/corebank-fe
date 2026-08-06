import { describe, expect, it } from "vitest"
import {
  addDays,
  addMonths,
  daysBetween,
  parseISO,
  toISO,
} from "@/shared/lib/date"

describe("parseISO / toISO", () => {
  it("yyyy-MM-dd를 로컬 자정 Date로 왕복 변환한다", () => {
    const date = parseISO("2026-07-23")
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(6)
    expect(date.getDate()).toBe(23)
    expect(toISO(date)).toBe("2026-07-23")
  })
})

describe("addDays", () => {
  it("일수를 더해 ISO 문자열을 반환한다", () => {
    expect(addDays("2026-07-23", 10)).toBe("2026-08-02")
  })
})

describe("daysBetween", () => {
  it("두 ISO 일자 사이의 일수를 계산한다", () => {
    expect(daysBetween("2026-07-23", "2026-08-01")).toBe(9)
  })

  it("종료일이 시작일보다 빠르면 음수를 반환한다", () => {
    expect(daysBetween("2026-08-01", "2026-07-23")).toBe(-9)
  })
})

describe("addMonths", () => {
  it("월말 보정 없이 개월 수를 더한다", () => {
    expect(addMonths("2026-01-15", 6)).toBe("2026-07-15")
  })

  it("존재하지 않는 날짜는 대상 월의 말일로 보정한다 (1/31 + 1개월 -> 2월 말일)", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28")
  })

  it("연도를 넘어가는 개월 수를 처리한다", () => {
    expect(addMonths("2026-11-30", 3)).toBe("2027-02-28")
  })
})
