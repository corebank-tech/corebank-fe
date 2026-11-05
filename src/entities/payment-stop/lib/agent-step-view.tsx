import { formatDateTime } from "@/shared/lib/format"
import type {
  AgentRunStepCard,
  AgentRunTimelineStep,
} from "@/shared/ui/agent-run-timeline"
import {
  asRecord,
  asString,
  asStringArray,
  type AgentRunStep,
} from "@/entities/payment-stop/api/agent-run"
import { TransactionNumberList } from "@/entities/payment-stop/ui/transaction-number-list"
import {
  DECISION_LABEL,
  DECISION_RESULTS,
  GATE_BRANCH_LABEL,
  labelOf,
} from "@/entities/payment-stop/lib/labels"

/** 단계 종류의 화면 이름. 업무 용어로 쓴다(서버 `AgentStepType`). */
export const AGENT_STEP_TYPE_LABEL: Record<string, string> = {
  CLAIMED: "작업 시작",
  CONTEXT_LOADED: "입력 확인",
  OCR: "서류 판독",
  TOOL_CALL: "원장 조회",
  CLAIM_EXTRACTED: "주장 정리",
  CONTRADICTION: "기록 대조",
  DRAFT_SUBMITTED: "판정안 제출",
  GATE_EVALUATED: "해제 요건 점검",
  FAILED: "분석 중단",
}

/**
 * 서버 규칙이 남긴 단계인가. 해제 요건 점검은 서버만 남기고(계약 §4), 점유 만료로 서버가
 * 남긴 중단 단계는 `detail.by` 가 `SERVER` 다.
 */
const isServerStep = (step: AgentRunStep) =>
  step.type === "GATE_EVALUATED" ||
  (step.type === "FAILED" && step.detail.by === "SERVER")

/** 도구 인자는 워커가 정한다. 문자열이면 그대로, 객체면 `키=값` 으로 이어 붙인다. */
const formatArgs = (args: unknown): string | null => {
  if (typeof args === "string") return args || null
  const entries = Object.entries(asRecord(args)).filter(
    ([, value]) => value != null && value !== "",
  )
  if (entries.length === 0) return null
  return entries
    .map(
      ([key, value]) =>
        `${key}=${typeof value === "object" ? JSON.stringify(value) : String(value)}`,
    )
    .join(", ")
}

const rowsWithValues = (rows: AgentRunStepCard["rows"]) =>
  rows.filter((row) => row.value != null && row.value !== "")

const toolCallCard = (detail: Record<string, unknown>): AgentRunStepCard => {
  const numbers = asStringArray(detail.transactionNumbers)
  return {
    title: `도구 ${asString(detail.tool) ?? "이름 없음"}`,
    rows: rowsWithValues([
      { label: "이유", value: asString(detail.reason) },
      { label: "조건", value: formatArgs(detail.args) },
      { label: "결과 요약", value: asString(detail.resultSummary) },
      {
        label: "근거 거래",
        value:
          numbers.length > 0 ? (
            <TransactionNumberList numbers={numbers} />
          ) : null,
      },
    ]),
  }
}

const contradictionCard = (
  detail: Record<string, unknown>,
): AgentRunStepCard | undefined => {
  const numbers = asStringArray(detail.transactionNumbers)
  const rows = rowsWithValues([
    { label: "주장", value: asString(detail.claim) },
    // 워커는 `ledgerFact` 로 보낸다. 계약 문서 초안의 `fact` 도 받아 둔다.
    {
      label: "원장 기록",
      value: asString(detail.ledgerFact) ?? asString(detail.fact),
    },
    {
      label: "관련 거래",
      value:
        numbers.length > 0 ? <TransactionNumberList numbers={numbers} /> : null,
    },
  ])
  return rows.length > 0 ? { title: "주장과 원장의 차이", rows } : undefined
}

const gateCard = (detail: Record<string, unknown>): AgentRunStepCard => {
  const allowed = asRecord(detail.allowedResults)
  const open = DECISION_RESULTS.filter((result) => allowed[result] === true)
  const branch = asString(detail.branch)
  const agentBranch = asString(detail.agentBranch)
  return {
    title: "서버 규칙 결과",
    rows: rowsWithValues([
      {
        label: "점검 결과",
        value: branch ? labelOf(GATE_BRANCH_LABEL, branch) : null,
      },
      {
        label: "AI 판정안",
        value: agentBranch ? labelOf(GATE_BRANCH_LABEL, agentBranch) : null,
      },
      {
        label: "열린 판정",
        value: open.map((result) => DECISION_LABEL[result]).join(", "),
      },
    ]),
  }
}

const contextCard = (
  detail: Record<string, unknown>,
): AgentRunStepCard | undefined => {
  const clause = typeof detail.clause === "number" ? detail.clause : null
  const disputed = asStringArray(detail.disputedTransactionNumbers)
  const from = asString(detail.ledgerFrom)
  const to = asString(detail.ledgerTo)
  const rows = rowsWithValues([
    { label: "사유 조항", value: clause != null ? `제${clause}호` : null },
    {
      label: "다툼 거래",
      value:
        disputed.length > 0 ? (
          <TransactionNumberList numbers={disputed} />
        ) : null,
    },
    {
      label: "원장 범위",
      value:
        from && to
          ? `${formatDateTimeText(from)} ~ ${formatDateTimeText(to)}`
          : null,
    },
  ])
  return rows.length > 0 ? { title: "읽은 입력", rows } : undefined
}

const claimsCard = (
  detail: Record<string, unknown>,
): AgentRunStepCard | undefined => {
  const claims = (Array.isArray(detail.claims) ? detail.claims : [])
    .map(asRecord)
    .map((claim) => ({
      text: asString(claim.text),
      quote: asString(claim.quote),
    }))
    .filter(
      (claim): claim is { text: string; quote: string | null } =>
        claim.text != null,
    )
  if (claims.length === 0) return undefined
  return {
    title: `정리한 주장 ${claims.length}건`,
    rows: claims.map((claim, index) => ({
      label: `주장 ${index + 1}`,
      value: claim.quote ? `${claim.text} (원문: ${claim.quote})` : claim.text,
    })),
  }
}

const draftCard = (detail: Record<string, unknown>): AgentRunStepCard => {
  const branch = asString(detail.branch)
  const evidence = asStringArray(detail.evidenceTransactionNumbers)
  const missing = asStringArray(detail.missingDocuments)
  return {
    title: "제출한 판정안",
    rows: rowsWithValues([
      {
        label: "AI 판정안",
        value: branch ? labelOf(GATE_BRANCH_LABEL, branch) : null,
      },
      {
        label: "근거 거래",
        value:
          evidence.length > 0 ? (
            <TransactionNumberList numbers={evidence} />
          ) : null,
      },
      {
        label: "누락 서류",
        value: missing.length > 0 ? missing.join(", ") : null,
      },
    ]),
  }
}

const cardFor = (step: AgentRunStep): AgentRunStepCard | undefined => {
  if (step.type === "CONTEXT_LOADED") return contextCard(step.detail)
  if (step.type === "TOOL_CALL") return toolCallCard(step.detail)
  if (step.type === "CLAIM_EXTRACTED") return claimsCard(step.detail)
  if (step.type === "CONTRADICTION") return contradictionCard(step.detail)
  if (step.type === "DRAFT_SUBMITTED") return draftCard(step.detail)
  if (step.type === "GATE_EVALUATED") return gateCard(step.detail)
  return undefined
}

/** 원장 범위처럼 단계 상세에 실린 시각을 화면 형식으로. 읽지 못하면 그대로 둔다. */
const formatDateTimeText = (value: string) =>
  Number.isNaN(new Date(value).getTime()) ? value : formatDateTime(value)

/** 중단 단계는 요약이 비어 있으면 `detail.reason` 을 보인다. */
const summaryOf = (step: AgentRunStep) =>
  step.summary ||
  (step.type === "FAILED" ? (asString(step.detail.reason) ?? "") : "")

const toTimelineStatus = (status: string): AgentRunTimelineStep["status"] =>
  status === "RUNNING" || status === "FAILED" ? status : "DONE"

/** 서버 단계 이벤트를 공용 타임라인 한 줄로 바꾼다. */
export const toTimelineStep = (step: AgentRunStep): AgentRunTimelineStep => ({
  seq: step.seq,
  actor: isServerStep(step) ? "SERVER" : "AGENT",
  typeLabel: labelOf(AGENT_STEP_TYPE_LABEL, step.type),
  title: step.title || labelOf(AGENT_STEP_TYPE_LABEL, step.type),
  summary: summaryOf(step),
  status: toTimelineStatus(step.type === "FAILED" ? "FAILED" : step.status),
  startedAt: step.startedAt,
  endedAt: step.endedAt,
  card: cardFor(step),
})

/**
 * 해제 요건 점검 단계가 낸 서버 갈래와 AI 판정안 갈래. 둘이 다르면 화면이 경고한다.
 * 해당 단계가 아직 없으면 `null` 이다.
 */
export const gateComparisonOf = (
  steps: AgentRunStep[],
): { branch: string; agentBranch: string } | null => {
  const gateStep = steps.findLast((step) => step.type === "GATE_EVALUATED")
  if (!gateStep) return null
  const branch = asString(gateStep.detail.branch)
  const agentBranch = asString(gateStep.detail.agentBranch)
  return branch && agentBranch ? { branch, agentBranch } : null
}
