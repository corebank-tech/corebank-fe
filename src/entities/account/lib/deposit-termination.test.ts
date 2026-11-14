import { describe, expect, it } from "vitest"
import {
  getDepositTerminationAction,
  parseDepositTerminationKind,
} from "@/entities/account/lib/deposit-termination"

const TODAY = "2026-11-14"

describe("getDepositTerminationAction", () => {
  it("MATURED는 만기일과 관계없이 만기해지", () => {
    expect(getDepositTerminationAction("MATURED", "2026-11-10", TODAY)).toEqual(
      { available: true, kind: "maturity" },
    )
    expect(getDepositTerminationAction("MATURED", null, TODAY)).toEqual({
      available: true,
      kind: "maturity",
    })
  })

  it("만기일 이전 ACTIVE는 중도해지", () => {
    expect(getDepositTerminationAction("ACTIVE", "2026-11-15", TODAY)).toEqual({
      available: true,
      kind: "early",
    })
  })

  it("만기 당일·경과 ACTIVE는 어느 해지도 시키지 않는다", () => {
    expect(getDepositTerminationAction("ACTIVE", TODAY, TODAY).available).toBe(
      false,
    )
    expect(
      getDepositTerminationAction("ACTIVE", "2026-11-01", TODAY).available,
    ).toBe(false)
  })

  it("만기일이 없는 ACTIVE는 해지 유형을 고르지 않는다", () => {
    expect(getDepositTerminationAction("ACTIVE", null, TODAY).available).toBe(
      false,
    )
  })

  it("SUSPENDED·CLOSED·알 수 없는 상태는 해지 불가", () => {
    expect(
      getDepositTerminationAction("SUSPENDED", "2026-12-01", TODAY),
    ).toEqual({ available: false, message: "거래정지" })
    expect(
      getDepositTerminationAction("CLOSED", "2026-12-01", TODAY).available,
    ).toBe(false)
    expect(
      getDepositTerminationAction(undefined, "2026-12-01", TODAY).available,
    ).toBe(false)
  })
})

describe("parseDepositTerminationKind", () => {
  it("두 유형만 받고 나머지는 null", () => {
    expect(parseDepositTerminationKind("maturity")).toBe("maturity")
    expect(parseDepositTerminationKind("early")).toBe("early")
    expect(parseDepositTerminationKind("x")).toBeNull()
    expect(parseDepositTerminationKind(undefined)).toBeNull()
  })
})
