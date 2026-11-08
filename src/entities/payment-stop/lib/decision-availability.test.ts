import { describe, expect, it } from "vitest"
import { closedDecisionReason } from "@/entities/payment-stop/lib/decision-availability"

const objection = (
  overrides: {
    branch?: string
    allowed?: Partial<Record<"ACCEPTED" | "PARTIAL" | "REJECTED", boolean>>
    clause?: number
    litigationPending?: boolean
    objectionStatus?: string
    replies?: string[]
  } = {},
) => ({
  clause: overrides.clause ?? 1,
  litigationPending: overrides.litigationPending ?? false,
  objectionStatus: overrides.objectionStatus ?? "UNDER_REVIEW",
  externalChecks: (overrides.replies ?? []).map((reply, index) => ({
    checkId: index + 1,
    agency: "POLICE",
    status: "REPLIED",
    reply,
    requestedAt: null,
    repliedAt: null,
  })),
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

  it("수용과 일부 지급정지는 소명 완비 확인 뒤에만 열린다", () => {
    for (const objectionStatus of [
      "RECEIVED",
      "SUPPLEMENT_REQUESTED",
      "SUPPLEMENT_SUBMITTED",
    ]) {
      const opened = objection({
        objectionStatus,
        allowed: { ACCEPTED: true, PARTIAL: true },
      })
      expect(closedDecisionReason(opened, "ACCEPTED")).toContain(
        "소명 완비 확인 뒤",
      )
      expect(closedDecisionReason(opened, "PARTIAL")).toContain(
        "소명 완비 확인 뒤",
      )
      // 불수용은 완비 확인 전에도 쓸 수 있다(D9, D32)
      expect(closedDecisionReason(opened, "REJECTED")).toBeNull()
    }
  })

  it("해제 요건이 닫혔으면 상태보다 요건 이유를 먼저 말한다", () => {
    expect(
      closedDecisionReason(
        objection({ objectionStatus: "RECEIVED", branch: "FRAUD_PATTERN" }),
        "ACCEPTED",
      ),
    ).toContain("사기 패턴")
  })

  it("승인 대기 중에는 어느 판정도 열지 않는다", () => {
    const pending = objection({
      objectionStatus: "PENDING_APPROVAL",
      allowed: { ACCEPTED: true },
    })
    expect(closedDecisionReason(pending, "ACCEPTED")).toContain("승인 대기")
    expect(closedDecisionReason(pending, "REJECTED")).toContain("승인 대기")
  })

  it("외부 기관의 부정 회신으로 닫혔으면 원장 근거가 아니라 회신을 이유로 든다", () => {
    expect(
      closedDecisionReason(
        objection({
          branch: "FRAUD_PATTERN",
          replies: ["INVOLVEMENT_SUSPECTED"],
        }),
        "ACCEPTED",
      ),
    ).toContain("외부 기관")
    expect(
      closedDecisionReason(
        objection({ branch: "FRAUD_PATTERN", replies: ["OWNER_UNRELATED"] }),
        "ACCEPTED",
      ),
    ).toContain("사기 패턴")
  })
})
