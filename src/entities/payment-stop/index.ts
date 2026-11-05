export type {
  DisputedTransfer,
  GateRuleCheck,
  ObjectionDecision,
  ObjectionDetail,
  ObjectionSummary,
  ReleaseGate,
} from "@/entities/payment-stop/api/objection"
export {
  useConfirmObjectionDecision,
  useObjectionDetail,
  useObjectionList,
  useReceiveObjection,
  useRegisterPaymentStopCase,
} from "@/entities/payment-stop/api/objection"

export type {
  DecisionResult,
  ObjectionClause,
} from "@/entities/payment-stop/lib/labels"
export {
  AGENT_RUN_STATUS_LABEL,
  CASE_STATUS_LABEL,
  CLAUSE_LABEL,
  CLAUSE_SCOPE,
  DECISION_LABEL,
  DECISION_RESULTS,
  GATE_BRANCH_LABEL,
  GATE_RULE_LABEL,
  OBJECTION_CLAUSES,
  OBJECTION_STATUS_LABEL,
  RULE_BASIS_LABEL,
  formatClause,
  isDecisionResult,
  isReleasingDecision,
  labelOf,
} from "@/entities/payment-stop/lib/labels"
export { closedDecisionReason } from "@/entities/payment-stop/lib/decision-availability"

export type {
  AgentRun,
  AgentRunSnapshot,
  AgentRunStep,
  DraftClaim,
  DraftContradiction,
  ReviewDraft,
} from "@/entities/payment-stop/api/agent-run"
export {
  AGENT_POLL_INTERVAL_MS,
  isRunActive,
  useAgentRunSnapshots,
  useAgentRunSteps,
  useAgentRuns,
  useRequestObjectionReview,
  useReviewDraft,
} from "@/entities/payment-stop/api/agent-run"
export {
  AGENT_STEP_TYPE_LABEL,
  gateComparisonOf,
  toTimelineStep,
} from "@/entities/payment-stop/lib/agent-step-view"
export { TransactionNumberList } from "@/entities/payment-stop/ui/transaction-number-list"

export type {
  MyObjectionDraft,
  MyObjectionSupplementDraft,
  MyPaymentStop,
} from "@/entities/payment-stop/api/my-objection"
export {
  myObjectionFingerprint,
  mySupplementFingerprint,
  useMyPaymentStops,
  useSubmitMyObjection,
  useSubmitMyObjectionSupplement,
} from "@/entities/payment-stop/api/my-objection"
export {
  CLAUSE_HELP,
  MY_OBJECTION_STATUS_LABEL,
  SUPPLEMENT_REQUESTED,
} from "@/entities/payment-stop/lib/my-objection-labels"
export type { FileSelection } from "@/entities/payment-stop/lib/objection-files"
export {
  MAX_EVIDENCE_COUNT,
  MAX_FILE_BYTES,
  MAX_FILE_COUNT,
  MAX_TOTAL_BYTES,
  OBJECTION_FILE_ACCEPT,
  inspectObjectionFile,
  readFileKind,
  selectObjectionFiles,
  summarizeFiles,
} from "@/entities/payment-stop/lib/objection-files"
