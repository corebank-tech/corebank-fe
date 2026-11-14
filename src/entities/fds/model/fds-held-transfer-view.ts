export type FdsPolicy = "A" | "B"
export type FdsRiskStatus = "MATCH" | "NO_MATCH" | "UNAVAILABLE"
export type FdsAgentStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED"
export type FdsActor = "SERVER" | "AGENT" | "HUMAN"
export type FdsCallResult = "CONFIRMED" | "DENIED" | "UNREACHABLE"
export type FdsDecision = "APPROVE" | "REJECT"

export type FdsStepReveal = {
  history?: string[]
  recipientContext?: string
  agentFinding?: string
  agentError?: string
}

export type FdsInvestigationStep = {
  id: string
  actor: FdsActor
  title: string
  narration: string
  input: string
  output: string
  durationMs: number
  tool?: "get_transfer_history" | "get_recipient_context"
  reveal?: FdsStepReveal
}

/**
 * FDS UI가 사용하는 표시 모델. 실제 API DTO가 아니며, 후속 연동 시
 * API 응답을 이 모양으로 바꾸는 adapter를 두어 화면을 서버 계약에서 분리한다.
 */
export type FdsHeldTransferView = {
  id: string
  caseNo: string
  flowId: string
  receivedAt: string
  customer: string
  withdrawalAccountNumber: string
  recipientBankCode: string
  recipientBankName: string
  recipientAccountNumber: string
  recipientName: string
  amount: number
  policy: FdsPolicy
  serverHoldReason: string
  agentStatus: FdsAgentStatus
  agentFinding?: string
  sourceNotice: string
  riskStatus: FdsRiskStatus
  riskDatasetVersion?: string
  riskRecordId?: string
  riskReason: string
  steps: FdsInvestigationStep[]
}

export const revealAt = (
  steps: FdsInvestigationStep[],
  index: number,
): FdsStepReveal =>
  steps
    .slice(0, index + 1)
    .reduce<FdsStepReveal>(
      (result, step) => ({ ...result, ...step.reveal }),
      {},
    )

export const formatWon = (amount: number) =>
  `${amount.toLocaleString("ko-KR")}원`
