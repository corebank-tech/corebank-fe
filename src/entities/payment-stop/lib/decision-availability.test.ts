import { describe, expect, it } from "vitest"
import { decisionAvailability } from "@/entities/payment-stop/lib/decision-availability"

type Result = "ACCEPTED" | "PARTIAL" | "REJECTED"

const objection = (
  overrides: {
    branch?: string
    allowed?: Partial<Record<Result, boolean>>
    discretionary?: Partial<Record<Result, boolean>>
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
    discretionaryResults: {
      ACCEPTED: false,
      PARTIAL: false,
      REJECTED: false,
      ...overrides.discretionary,
    },
    rules: [],
  },
})

/** 고를 수 없으면 그 이유, 고를 수 있으면(재량 포함) `null`. */
const closedReason = (
  context: ReturnType<typeof objection>,
  result: Result,
): string | null => {
  const availability = decisionAvailability(context, result)
  return availability.kind === "CLOSED" ? availability.reason : null
}

describe("decisionAvailability", () => {
  it("서버가 연 판정에는 이유를 달지 않는다", () => {
    expect(
      closedReason(objection({ allowed: { ACCEPTED: true } }), "ACCEPTED"),
    ).toBeNull()
    expect(closedReason(objection(), "REJECTED")).toBeNull()
  })

  it("소송 계속을 갈래보다 먼저 말한다", () => {
    expect(
      closedReason(
        objection({ branch: "FRAUD_PATTERN", litigationPending: true }),
        "ACCEPTED",
      ),
    ).toContain("소송")
  })

  it("사기 패턴과 판단 불가를 구분한다", () => {
    expect(
      closedReason(objection({ branch: "FRAUD_PATTERN" }), "ACCEPTED"),
    ).toContain("사기 패턴")
    expect(
      closedReason(objection({ branch: "UNDETERMINED", clause: 3 }), "PARTIAL"),
    ).toContain("정상 근거를 확인하지 못해")
  })

  it("정상 갈래에서는 사유 조항이 해제 범위를 정한다", () => {
    expect(closedReason(objection({ clause: 3 }), "ACCEPTED")).toContain(
      "제3호",
    )
    expect(closedReason(objection({ clause: 2 }), "PARTIAL")).toContain(
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
      expect(closedReason(opened, "ACCEPTED")).toContain("소명 완비 확인 뒤")
      expect(closedReason(opened, "PARTIAL")).toContain("소명 완비 확인 뒤")
      // 불수용은 완비 확인 전에도 쓸 수 있다(D9, D32)
      expect(closedReason(opened, "REJECTED")).toBeNull()
    }
  })

  it("해제 요건이 닫혔으면 상태보다 요건 이유를 먼저 말한다", () => {
    expect(
      closedReason(
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
    expect(closedReason(pending, "ACCEPTED")).toContain("승인 대기")
    expect(closedReason(pending, "REJECTED")).toContain("승인 대기")
  })

  it("외부 기관의 부정 회신으로 닫혔으면 원장 근거가 아니라 회신을 이유로 든다", () => {
    expect(
      closedReason(
        objection({
          branch: "FRAUD_PATTERN",
          replies: ["INVOLVEMENT_SUSPECTED"],
        }),
        "ACCEPTED",
      ),
    ).toContain("외부 기관")
    expect(
      closedReason(
        objection({ branch: "FRAUD_PATTERN", replies: ["OWNER_UNRELATED"] }),
        "ACCEPTED",
      ),
    ).toContain("사기 패턴")
  })
  it("해제 요건 점검이 닫아도 재량으로 쓸 수 있으면 막지 않고 점검이 닫힌 이유를 준다", () => {
    expect(
      decisionAvailability(
        objection({
          branch: "UNDETERMINED",
          discretionary: { ACCEPTED: true },
        }),
        "ACCEPTED",
      ),
    ).toEqual({
      kind: "DISCRETIONARY",
      gateReason:
        "해제 요건 점검: 거래 기록으로 정상 근거를 확인하지 못했습니다.",
    })
    expect(
      decisionAvailability(
        objection({ allowed: { ACCEPTED: true } }),
        "ACCEPTED",
      ),
    ).toEqual({ kind: "OPEN" })
  })

  it("재량으로도 못 쓰는 판정은 소송, 사유 조항, 부정 회신을 이유로 닫는다", () => {
    expect(
      closedReason(
        objection({ branch: "FRAUD_PATTERN", litigationPending: true }),
        "ACCEPTED",
      ),
    ).toContain("소송")
    // 사기 패턴이어도 재량을 막은 것은 사유 조항이라 조항을 이유로 든다
    expect(
      closedReason(
        objection({ branch: "FRAUD_PATTERN", clause: 1 }),
        "PARTIAL",
      ),
    ).toContain("제1호와 제2호")
  })

  it("재량 판정도 소명 완비 확인 전에는 닫고, 확인 뒤 재량 판정이 된다고 말한다", () => {
    const reason = closedReason(
      objection({
        objectionStatus: "RECEIVED",
        branch: "FRAUD_PATTERN",
        discretionary: { ACCEPTED: true },
      }),
      "ACCEPTED",
    )
    expect(reason).toContain("소명 완비 확인 뒤")
    expect(reason).toContain("재량 판정")
  })
})
