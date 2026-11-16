import type { FdsHoldDetail } from "@/shared/api/generated"

export type FdsReviewStageId =
  | "hold"
  | "investigation"
  | "history"
  | "recipient"
  | "agent"
  | "risk"
  | "call"
  | "decision"

export type FdsReviewStageState =
  "done" | "active" | "waiting" | "failed" | "recovery"

export type FdsReviewStage = {
  id: FdsReviewStageId
  title: string
  actor: "서버 규칙" | "AI Agent" | "담당자"
  state: FdsReviewStageState
}

const definitions: Omit<FdsReviewStage, "state">[] = [
  { id: "hold", title: "이체 보류", actor: "서버 규칙" },
  { id: "investigation", title: "조사 등록", actor: "서버 규칙" },
  { id: "history", title: "최근 이체 이력 조회", actor: "AI Agent" },
  { id: "recipient", title: "수취인 관계 조회", actor: "AI Agent" },
  { id: "agent", title: "Agent 조사", actor: "AI Agent" },
  { id: "risk", title: "위험 계좌 재검증", actor: "서버 규칙" },
  { id: "call", title: "고객 확인", actor: "담당자" },
  { id: "decision", title: "담당자 판정", actor: "담당자" },
]

export const buildFdsReviewStages = (
  detail: FdsHoldDetail,
): FdsReviewStage[] => {
  const investigation = detail.investigation
  const reportStatus = detail.agentReport?.status
  const action = detail.adminAction
  const registrationExists = investigation != null
  const investigationRunning = investigation?.status === "RUNNING"
  const investigationFinished = investigation?.status === "COMPLETED"
  const investigationFailed =
    investigation?.status === "FAILED" || reportStatus === "FAILED"
  const historyDone = detail.toolResults?.history?.executed === true
  const recipientDone = detail.toolResults?.recipientContext?.executed === true
  const agentDone = investigationFinished || reportStatus === "COMPLETED"
  const riskDone = detail.riskAccountCheck?.status != null
  const callDone =
    detail.riskAccountCheck?.status === "MATCH" ||
    (detail.callRecords?.length ?? 0) > 0
  const actionRecovery =
    action?.recoveryRequired === true ||
    detail.riskRegistration?.recoveryRequired === true

  const states: Record<FdsReviewStageId, FdsReviewStageState> = {
    hold: "done",
    investigation: !registrationExists
      ? "active"
      : investigation?.status === "PENDING"
        ? "active"
        : "done",
    history: historyDone ? "done" : investigationRunning ? "active" : "waiting",
    recipient: recipientDone
      ? "done"
      : investigationRunning && historyDone
        ? "active"
        : "waiting",
    agent: investigationFailed
      ? "failed"
      : agentDone
        ? "done"
        : investigationRunning && historyDone && recipientDone
          ? "active"
          : "waiting",
    risk: riskDone
      ? "done"
      : agentDone || investigationFailed
        ? "active"
        : "waiting",
    call: callDone
      ? "done"
      : riskDone && (agentDone || investigationFailed)
        ? "active"
        : "waiting",
    decision: actionRecovery
      ? "recovery"
      : action?.status === "FAILED" || action?.status === "CONFLICT"
        ? "failed"
        : action?.status === "COMPLETED"
          ? "done"
          : action?.status === "PENDING" || callDone
            ? "active"
            : "waiting",
  }

  // 조사 실패는 해당 단계에서 멈추지만 보류는 유지되고 고객 확인은 가능하다.
  if (investigationFailed) {
    states.investigation = "done"
    states.history = historyDone ? "done" : "waiting"
    states.recipient = recipientDone ? "done" : "waiting"
  }

  return definitions.map((stage) => ({ ...stage, state: states[stage.id] }))
}

export const currentFdsReviewStage = (
  stages: FdsReviewStage[],
): FdsReviewStage => {
  // 최종 조치가 끝난 사건은 늦게 종료된 조사 작업의 상태보다 담당자 판정을 우선한다.
  const decision = stages.find((stage) => stage.id === "decision")
  if (decision?.state === "done") return decision
  return (
    stages.find((stage) =>
      ["active", "failed", "recovery"].includes(stage.state),
    ) ?? stages.at(-1)!
  )
}

export const shouldPollFdsHoldDetail = (detail?: FdsHoldDetail): boolean =>
  detail != null &&
  (detail.investigation?.status === "PENDING" ||
    detail.investigation?.status === "RUNNING" ||
    detail.behaviorScore?.status === "PENDING" ||
    detail.adminAction?.status === "PENDING" ||
    detail.riskRegistration?.status === "PENDING" ||
    detail.adminAction?.recoveryRequired === true ||
    detail.riskRegistration?.recoveryRequired === true)
