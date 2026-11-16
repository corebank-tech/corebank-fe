import { describe, expect, it } from "vitest"
import {
  FDS_HELD_TRANSFER_FIXTURES,
  findFdsHeldTransfer,
} from "@/entities/fds/fixtures/fds-held-transfers"

describe("FDS 보류 거래 UI fixture", () => {
  it("A 정책·B 정책·Agent 장애 사건을 제공한다", () => {
    expect(FDS_HELD_TRANSFER_FIXTURES.map((item) => item.id)).toEqual([
      "policy-a-risk-match",
      "policy-b-no-match",
      "agent-failure-unavailable",
    ])
  })

  it("MATCH는 정책 A, NO_MATCH는 정책 B, 조사 장애는 UNAVAILABLE을 재현한다", () => {
    expect(findFdsHeldTransfer("policy-a-risk-match")).toMatchObject({
      policy: "A",
      riskStatus: "MATCH",
      agentStatus: "COMPLETED",
    })
    expect(findFdsHeldTransfer("policy-b-no-match")).toMatchObject({
      policy: "B",
      riskStatus: "NO_MATCH",
      agentStatus: "COMPLETED",
    })
    expect(findFdsHeldTransfer("agent-failure-unavailable")).toMatchObject({
      policy: "B",
      riskStatus: "UNAVAILABLE",
      agentStatus: "FAILED",
    })
  })

  it("정상 거래는 보류 목록에 포함하지 않는다", () => {
    expect(
      FDS_HELD_TRANSFER_FIXTURES.every(
        (item) => item.serverHoldReason.length > 0,
      ),
    ).toBe(true)
  })
})
