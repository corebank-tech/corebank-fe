import { describe, expect, it } from "vitest"
import { getMaturityNotice } from "@/entities/account/lib/maturity-notice"

describe("getMaturityNotice", () => {
  const today = "2026-11-04"

  it("만기까지 남은 일수를 표시한다", () => {
    expect(getMaturityNotice("2026-11-11", "ACTIVE", today)).toBe("D-7")
  })

  it("만기 하루 전에는 D-1을 표시한다", () => {
    expect(getMaturityNotice("2026-11-05", "ACTIVE", today)).toBe("D-1")
  })

  it("만기 당일이지만 ACTIVE면 D-day를 표시한다", () => {
    expect(getMaturityNotice("2026-11-04", "ACTIVE", today)).toBe("D-day")
  })

  it("MATURED 상태면 만기 도달을 표시한다", () => {
    expect(getMaturityNotice("2026-11-04", "MATURED", today)).toBe("만기 도달")
  })

  it("만기일이 지났지만 ACTIVE면 상태를 단정하지 않는다", () => {
    expect(getMaturityNotice("2026-11-03", "ACTIVE", today)).toBe("만기일 경과")
  })

  it("만기일이 없으면 안내하지 않는다", () => {
    expect(getMaturityNotice(null, "ACTIVE", today)).toBeNull()
  })

  it("해지 계좌는 만기 안내를 표시하지 않는다", () => {
    expect(getMaturityNotice("2026-11-03", "CLOSED", today)).toBeNull()
  })

  it("월말을 넘어가는 날짜 차이를 계산한다", () => {
    expect(getMaturityNotice("2026-12-01", "ACTIVE", "2026-11-30")).toBe("D-1")
  })
})
