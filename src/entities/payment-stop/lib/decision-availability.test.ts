import { describe, expect, it } from "vitest"
import { closedDecisionReason } from "@/entities/payment-stop/lib/decision-availability"

const objection = (
  overrides: {
    branch?: string
    allowed?: Partial<Record<"ACCEPTED" | "PARTIAL" | "REJECTED", boolean>>
    clause?: number
    litigationPending?: boolean
  } = {},
) => ({
  clause: overrides.clause ?? 1,
  litigationPending: overrides.litigationPending ?? false,
  gate: {
    branch: overrides.branch ?? "NORMAL_ACCEPT",
    simplifiedExcluded: false,
    rulesVersion: "2026-11-03.1",
    allowedResults: {
      ACCEPTED: false,
      PARTIAL: false,
      REJECTED: true,
      ...overrides.allowed,
    },
    rules: [],
  },
})

describe("closedDecisionReason", () => {
  it("서버가 연 판정에는 이유를 달지 않는다", () => {
    expect(
      closedDecisionReason(
        objection({ allowed: { ACCEPTED: true } }),
        "ACCEPTED",
      ),
    ).toBeNull()
    expect(closedDecisionReason(objection(), "REJECTED")).toBeNull()
  })

  it("소송 계속을 갈래보다 먼저 말한다", () => {
    expect(
      closedDecisionReason(
        objection({ branch: "FRAUD_PATTERN", litigationPending: true }),
        "ACCEPTED",
      ),
    ).toContain("소송")
  })

  it("사기 패턴과 판단 불가를 구분한다", () => {
    expect(
      closedDecisionReason(objection({ branch: "FRAUD_PATTERN" }), "ACCEPTED"),
    ).toContain("사기 패턴")
    expect(
      closedDecisionReason(objection({ branch: "UNDETERMINED" }), "PARTIAL"),
    ).toContain("정상 근거를 확인하지 못해")
  })

  it("정상 갈래에서는 사유 조항이 해제 범위를 정한다", () => {
    expect(
      closedDecisionReason(objection({ clause: 3 }), "ACCEPTED"),
    ).toContain("제3호")
    expect(closedDecisionReason(objection({ clause: 2 }), "PARTIAL")).toContain(
      "제1호와 제2호",
    )
  })
})
