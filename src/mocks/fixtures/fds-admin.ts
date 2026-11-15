import type { FdsHoldDetail, FdsHoldListItem } from "@/shared/api/generated"

const base = (
  id: number,
  risk: "MATCH" | "NO_MATCH" | "UNAVAILABLE",
): FdsHoldDetail => ({
  transferHoldId: id,
  amount: 3_000_000,
  holdStatus: "HELD",
  recipientAccountMasked: "110-***-123456",
  originalTransfer: {
    transferHoldId: id,
    holdStatus: "HELD",
    heldAt: "2026-11-15T09:12:00+09:00",
    amount: 3_000_000,
    recipientBankCode: "088",
    recipientAccountMasked: "110-***-123456",
    releaseMode: "MANUAL",
  },
  serverPolicy: {
    policyCode: id === 102 ? "B" : "A",
    count10m: 3,
    amount10m: 9_000_000,
    hesitationInWindow: id !== 102,
    newRecipientAtWindowStart: id === 102,
  },
  behaviorSummary: {
    backCount: 2,
    amountRevisionCount: 2,
    confirmActiveSeconds: 65,
    behaviorScoreStatus: "AVAILABLE",
    behaviorRiskScore: 0.82,
  },
  behaviorScore: {
    status: "AVAILABLE",
    score: 0.82,
    modelVersion: "mock-v1",
    featureVersion: "mock-v1",
  },
  riskAccountCheck: {
    status: risk,
    riskAccountId: risk === "MATCH" ? 77 : undefined,
    datasetVersion: "mock-20261115",
    unavailableReason: risk === "UNAVAILABLE" ? "mock outage" : undefined,
    revalidateBeforeAction: true,
  },
  investigation: {
    investigationId: `mock-${id}`,
    status: id === 103 ? "FAILED" : "COMPLETED",
    attemptCount: 1,
    failureReason: id === 103 ? "mock agent failure" : undefined,
  },
  toolResults: {
    history: {
      executed: true,
      hasMore: false,
      providedAt: "2026-11-15T09:13:00+09:00",
      items: [],
    },
    recipientContext: {
      executed: true,
      hasSucceededBeforeWindow: false,
      otherWithdrawalAccountCount: 0,
    },
  },
  agentReport: {
    schemaVersion: "1",
    investigationId: `mock-${id}`,
    status: id === 103 ? "FAILED" : "COMPLETED",
    summary: id === 103 ? undefined : "고객 확인이 필요합니다.",
    missingInformation: [],
    suggestedQuestions: ["이체를 요청하셨나요?"],
  },
  callRecords:
    risk === "MATCH"
      ? []
      : [
          {
            callRecordId: id * 10,
            callResult: id === 102 ? "CUSTOMER_DENIED" : "NO_ANSWER",
            adminId: 1,
            investigationReason: "MSW 고객 확인",
            recordedAt: "2026-11-15T09:20:00+09:00",
            selectedByAction: false,
          },
        ],
})

export const FDS_ADMIN_DETAILS: Record<number, FdsHoldDetail> = {
  101: base(101, "MATCH"),
  102: base(102, "NO_MATCH"),
  103: base(103, "UNAVAILABLE"),
}
export const FDS_ADMIN_LIST: FdsHoldListItem[] = Object.values(
  FDS_ADMIN_DETAILS,
).map((detail) => ({
  transferHoldId: detail.transferHoldId,
  heldAt: detail.originalTransfer?.heldAt,
  amount: detail.amount,
  recipientBankCode: detail.originalTransfer?.recipientBankCode,
  recipientAccountMasked: detail.recipientAccountMasked,
  policyCode: detail.serverPolicy?.policyCode,
  holdStatus: detail.holdStatus,
  investigationStatus: detail.investigation?.status,
  behaviorScoreStatus: detail.behaviorScore?.status,
  riskAccountStatus: detail.riskAccountCheck?.status,
  latestCallResult: detail.callRecords?.at(-1)?.callResult,
  latestActionStatus: detail.adminAction?.status,
}))
