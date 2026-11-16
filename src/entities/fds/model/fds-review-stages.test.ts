import { describe, expect, it } from "vitest"
import {
  buildFdsReviewStages,
  currentFdsReviewStage,
  shouldPollFdsHoldDetail,
} from "@/entities/fds/model/fds-review-stages"
import type { FdsHoldDetail } from "@/shared/api/generated"

const stage = (detail: FdsHoldDetail, id: string) =>
  buildFdsReviewStages(detail).find((item) => item.id === id)?.state

describe("FDS 실제 응답 처리 단계", () => {
  it("조사 PENDING이면 조사 등록이 현재 단계이고 폴링한다", () => {
    const detail: FdsHoldDetail = {
      holdStatus: "HELD",
      investigation: { status: "PENDING" },
    }
    expect(currentFdsReviewStage(buildFdsReviewStages(detail)).id).toBe(
      "investigation",
    )
    expect(shouldPollFdsHoldDetail(detail)).toBe(true)
  })

  it("Tool 실행 결과를 각 조회 단계 완료로 표시한다", () => {
    const detail: FdsHoldDetail = {
      investigation: { status: "RUNNING" },
      toolResults: {
        history: { executed: true },
        recipientContext: { executed: true },
      },
    }
    expect(stage(detail, "history")).toBe("done")
    expect(stage(detail, "recipient")).toBe("done")
    expect(stage(detail, "agent")).toBe("active")
  })

  it("Agent 완료 뒤 위험 계좌와 고객 확인 단계가 이어진다", () => {
    const detail: FdsHoldDetail = {
      investigation: { status: "COMPLETED" },
      agentReport: { status: "COMPLETED" },
      riskAccountCheck: { status: "NO_MATCH" },
    }
    expect(stage(detail, "agent")).toBe("done")
    expect(stage(detail, "risk")).toBe("done")
    expect(currentFdsReviewStage(buildFdsReviewStages(detail)).id).toBe("call")
  })

  it("조사 실패와 조치 복구 필요를 별도 상태로 표시한다", () => {
    expect(stage({ investigation: { status: "FAILED" } }, "agent")).toBe(
      "failed",
    )
    expect(
      stage(
        {
          investigation: { status: "COMPLETED" },
          riskAccountCheck: { status: "NO_MATCH" },
          callRecords: [{ callRecordId: 1 }],
          adminAction: { status: "FAILED", recoveryRequired: true },
        },
        "decision",
      ),
    ).toBe("recovery")
  })

  it("콜 기록과 완료 조치를 단계 완료로 복원하고 폴링을 멈춘다", () => {
    const detail: FdsHoldDetail = {
      investigation: { status: "COMPLETED" },
      riskAccountCheck: { status: "NO_MATCH" },
      callRecords: [{ callRecordId: 1 }],
      adminAction: { status: "COMPLETED" },
    }
    expect(stage(detail, "call")).toBe("done")
    expect(stage(detail, "decision")).toBe("done")
    expect(shouldPollFdsHoldDetail(detail)).toBe(false)
  })

  it("조사가 PENDING이어도 관리자 조치가 완료되면 담당자 판정을 현재 단계로 표시한다", () => {
    const detail: FdsHoldDetail = {
      investigation: { status: "PENDING" },
      callRecords: [{ callRecordId: 1 }],
      adminAction: { status: "COMPLETED" },
    }

    expect(currentFdsReviewStage(buildFdsReviewStages(detail)).id).toBe(
      "decision",
    )
  })

  it("조사가 실패해도 위험 계좌 결과가 있으면 재검증 단계를 완료로 표시한다", () => {
    const detail: FdsHoldDetail = {
      investigation: { status: "FAILED" },
      riskAccountCheck: { status: "UNAVAILABLE" },
    }

    expect(stage(detail, "risk")).toBe("done")
  })
})
