import { describe, expect, it } from "vitest"
import { FDS_BEHAVIOR_SCENARIOS } from "@/mocks/fixtures/fds-behavior-scenarios"

describe("FDS 정책 시연 fixture", () => {
  it("정책 A는 STEP_BACK 두 건과 다른 참 조건을 서버 판정값으로 제공한다", () => {
    const scenario = FDS_BEHAVIOR_SCENARIOS.policyA
    expect(
      scenario.eventTypes.filter((type) => type === "STEP_BACK"),
    ).toHaveLength(2)
    expect(scenario.serverDecision).toMatchObject({
      backCount: 2,
      amountRevisionCount: 2,
      hesitationWarning: true,
      policyCode: "A",
    })
  })

  it("정책 B fixture는 망설임 변경의 영향을 받지 않는다", () => {
    expect(FDS_BEHAVIOR_SCENARIOS.policyB.serverDecision).toEqual({
      backCount: 0,
      amountRevisionCount: 0,
      confirmActiveSeconds: 12,
      hesitationWarning: false,
      policyCode: "B",
    })
  })
})
