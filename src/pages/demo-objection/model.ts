/**
 * 지급정지 이의제기 AI 심사 지원 — 시연 프로토타입의 데이터 모델.
 *
 * 서버 없이 시나리오 스크립트를 단계별로 흘려보내 Agent 실행을 재현한다.
 * 실제 구현(PLAN-AGENT PA-05~PA-11)의 단계 이벤트 형식을 화면 쪽에서 미리 써 보는 용도다.
 */

/** 처리 흐름 그래프의 노드. 위에서부터 실제 처리 순서다. */
export type StageId =
  | "INTAKE"
  | "OCR"
  | "CLAIMS"
  | "LEDGER"
  | "EXTERNAL"
  | "DRAFT"
  | "GATE"
  | "DECISION"
  | "ACCOUNT"

/** 누가 그 단계를 수행하는가 — Human-in-the-Loop 를 화면에서 구분해 보여 준다. */
export type Actor = "AGENT" | "SERVER" | "HUMAN"

export type ClaimSource = "STATEMENT" | "OCR"

export type Claim = {
  id: string
  text: string
  /** 주장을 뽑은 원문 문장 또는 OCR 값. 신뢰도 점수 대신 출처를 보여 준다 */
  quote: string
  source: ClaimSource
  /** OCR 에서 나온 주장이면 서류의 어느 글자 영역인지. */
  fieldId?: string
}

export type FactKind = "LEDGER" | "EXTERNAL"

export type Fact = {
  id: string
  text: string
  kind: FactKind
  txIds?: string[]
  /** 다툼 거래이거나 그 이후 거래라 게이트 근거로 들어가지 않는 사실 */
  excludedFromGate?: boolean
}

/** 주장과 사실의 관계. 주장은 확인돼도 해제 근거가 되지 않는다 — 근거는 사실 쪽이다. */
export type Verdict = "CONFIRMED" | "CONTRADICTED" | "UNVERIFIED" | "EXCLUDED"

export type Link = {
  claimId: string
  factId?: string
  verdict: Verdict
  note: string
}

export type LedgerKind = "DISPUTED" | "RELATION" | "OTHER"

export type LedgerTx = {
  id: string
  /** ISO 로컬 시각 */
  at: string
  amount: number
  dir: "IN" | "OUT"
  counterparty: string
  kind: LedgerKind
  interbank?: boolean
  /** 다툼 거래 이후 거래 — 정상 근거에서 제외된다. */
  afterDispute?: boolean
  note?: string
}

export type DocumentField = {
  id: string
  label: string
  value: string
  confidence: number
}

/** OCR 이 읽은 글자 영역. 이미지 크기 대비 비율(0~1) */
export type OcrBox = { id: string; x: number; y: number; w: number; h: number }

export type RuleResult = "PASS" | "FAIL" | "NA" | "APPLIED"

export type GateRule = {
  id: string
  label: string
  condition: string
  /** 법, 당국 표준, 내부 기준 중 무엇에 근거한 규칙인지 */
  basis: string
  result: RuleResult
  detail: string
}

/** 이의제기 사유. 법 제7조제1항 각 호. 해제 범위를 정한다(제8조제1항제2호). */
export type Clause = 1 | 2 | 3

export type SubmittedDocument = {
  name: string
  status: "SUBMITTED" | "MISSING" | "LEDGER"
  note?: string
  /** 고객이 앱에서 첨부한 이미지(시연용 견본) */
  image?: string
}

/** 통지 기록. 실제 발송은 하지 않는다(PLAN D30). channel 은 1차 자료로 확인된 명의인 문자만 적고, 확인 못 한 수단은 "-" */
export type Notice = {
  to: string
  kind: string
  channel: string
  basis: string
}

/** 판정을 가르는 사실 하나를 보여 주는 그래프. 시나리오마다 종류가 다르다. */
export type EvidenceChartSpec =
  | {
      kind: "CLAIM_VS_RECORD"
      takeaway: string
      counterparty: string
      claimLabel: string
      claimFrom: string
      claimTo: string
    }
  | {
      kind: "RECURRING"
      takeaway: string
      rows: { label: string; counterparty: string }[]
    }
  | {
      kind: "BALANCE"
      takeaway: string
      from: string
      to: string
      startBalance: number
    }

export type GateBranch =
  "FRAUD_PATTERN" | "NORMAL_ACCEPT" | "NORMAL_PARTIAL" | "UNDETERMINED"

/** 보완 요청은 서버에서는 판정이 아니라 보완 기록이다(PLAN D32). 화면에서는 선택지로 둔다. */
export type DecisionResult = "ACCEPTED" | "PARTIAL" | "SUPPLEMENT" | "REJECTED"

export type AccountState = {
  stopLabel: "전부 지급정지" | "일부 지급정지" | "정상"
  balance: number
  hold: number
  available: number
}

export type DecisionPhase = "NONE" | "DRAFTED" | "APPROVED"

export type ToolCall = {
  name: string
  reason: string
  args: string
  result: string
  /** 이 조회를 하게 만든 고객 주장. 없으면 AI 가 스스로 정한 확인이다 */
  claimId?: string
}

/** 한 단계가 화면에 새로 드러내는 것. 화면 상태는 0번부터 현재 단계까지의 합이다. */
export type Reveal = {
  documentFields?: string[]
  claims?: string[]
  facts?: string[]
  links?: string[]
  ledger?: boolean
  ledgerFocus?: boolean
  injection?: boolean
  draft?: boolean
  gate?: boolean
  decision?: DecisionPhase
  accountAfter?: boolean
}

export type Step = {
  stage: StageId
  actor: Actor
  /** 타임라인 한 줄 */
  title: string
  /** 화면 아래 자막 — 지금 무슨 일이 일어나는지 */
  narration: string
  /** 진행 목록에 남기는 결과 한 줄 */
  result: string
  /** 모의 소요 시간(ms). 재생 속도 1배 기준 */
  durationMs: number
  /** 자동 재생에서 이 단계가 끝난 뒤 더 머무는 시간(ms). 발표자가 설명할 핵심 장면 */
  holdMs?: number
  tool?: ToolCall
  reveal?: Reveal
}

export type Scenario = {
  id: string
  name: string
  oneLine: string
  /** 심사 결론에 쓰는 한 문장 — 처음 보는 사람도 왜 이 결론인지 알 수 있게 */
  plainReason: string
  receivedAt: string
  caseInfo: {
    caseNo: string
    /** 지급정지가 걸린 근거. 이상거래 탐지가 아니라 피해자의 피해구제 신청이다(법 제3조, 제4조) */
    trigger: string
    holder: string
    account: string
    stoppedAt: string
    reporter: string
    disputedAmount: number
    completedAt: string
    dueDate: string
    remainingBusinessDays: number
    /** 보완 요청으로 늘어난 심사 기한 */
    dueDateAfter?: string
    simplified: boolean
  }
  clause: Clause
  documents: SubmittedDocument[]
  statement: {
    reason: string
    text: string[]
    injectionLine?: string
  }
  document?: {
    title: string
    /** 첨부 이미지와 OCR 영역. 없으면 화면이 서식을 직접 그린다 */
    image?: string
    boxes?: OcrBox[]
    fields: DocumentField[]
  }
  claims: Claim[]
  facts: Fact[]
  links: (Link & { id: string })[]
  ledger: LedgerTx[]
  ledgerWindow: { from: string; to: string; caption: string }
  /** 24시간 창·1시간 출금처럼 차트에 겹쳐 그릴 구간 */
  ledgerBands?: { from: string; to: string; label: string }[]
  chart: EvidenceChartSpec
  gateRules: GateRule[]
  gateBranch: GateBranch
  draft: {
    branch: GateBranch
    recommendation: string
    missing: string[]
    questions: string[]
    notice: string
  }
  allowed: Record<DecisionResult, { allowed: boolean; reason: string }>
  decision: {
    result: DecisionResult
    maker: string
    checker?: string
    reason: string
    /** 계좌에 무엇이 언제 반영되는지 한 줄 */
    release: string
  }
  notices: Notice[]
  accountBefore: AccountState
  accountAfter: AccountState
  steps: Step[]
}

export const STAGES: { id: StageId; label: string; actor: Actor }[] = [
  { id: "INTAKE", label: "소명 접수", actor: "HUMAN" },
  { id: "OCR", label: "서류 OCR", actor: "AGENT" },
  { id: "CLAIMS", label: "주장 추출", actor: "AGENT" },
  { id: "LEDGER", label: "원장 조회", actor: "AGENT" },
  { id: "EXTERNAL", label: "외부 확인", actor: "AGENT" },
  { id: "DRAFT", label: "판정안", actor: "AGENT" },
  { id: "GATE", label: "해제 게이트", actor: "SERVER" },
  { id: "DECISION", label: "담당자 승인", actor: "HUMAN" },
  { id: "ACCOUNT", label: "계좌 반영", actor: "SERVER" },
]

export const ACTOR_LABEL: Record<Actor, string> = {
  AGENT: "AI Agent",
  SERVER: "서버 규칙",
  HUMAN: "담당자",
}

/** 업무 용어로 쓴 AI 권고·요건 점검 결과 */
export const BRANCH_LABEL: Record<GateBranch, string> = {
  FRAUD_PATTERN: "거래 기록상 사기 정황",
  NORMAL_ACCEPT: "거래 기록상 정상 거래",
  NORMAL_PARTIAL: "일부 지급정지 요건 충족",
  UNDETERMINED: "거래 기록으로 판단 불가",
}

export const VERDICT_VIEW: Record<
  Verdict,
  { label: string; badge: "success" | "danger" | "neutral" | "warning" }
> = {
  CONFIRMED: { label: "일치", badge: "success" },
  CONTRADICTED: { label: "불일치", badge: "danger" },
  UNVERIFIED: { label: "확인 불가", badge: "neutral" },
  EXCLUDED: { label: "판단 근거 아님", badge: "warning" },
}

export const DECISION_LABEL: Record<DecisionResult, string> = {
  ACCEPTED: "수용",
  PARTIAL: "일부 지급정지",
  SUPPLEMENT: "보완 요청",
  REJECTED: "불수용",
}

export const DECISION_ORDER: DecisionResult[] = [
  "ACCEPTED",
  "PARTIAL",
  "SUPPLEMENT",
  "REJECTED",
]

export const CLAUSE_LABEL: Record<Clause, string> = {
  1: "사기이용계좌 아님",
  2: "정당한 대가로 받은 돈",
  3: "피해금 편취에 쓰이지 않음",
}

/** 사유가 정하는 해제 범위 */
export const CLAUSE_SCOPE: Record<Clause, string> = {
  1: "수용 시 전부 해제",
  2: "수용 시 전부 해제",
  3: "수용 시 입금액 제외 해제",
}

export const DOC_STATUS: Record<
  SubmittedDocument["status"],
  { label: string; badge: "success" | "danger" | "neutral" }
> = {
  SUBMITTED: { label: "제출", badge: "success" },
  MISSING: { label: "미제출", badge: "danger" },
  LEDGER: { label: "원장 확인", badge: "neutral" },
}

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`
