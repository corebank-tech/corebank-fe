/**
 * 지급정지 이의제기 심사의 화면 표기(계획 D8, D28, D33).
 *
 * 서버는 코드만 준다. 표기는 업무 용어로 쓴다 — 시스템 용어("게이트")를 화면에 그대로
 * 띄우면 담당자가 법령, 당국 표준의 어휘와 맞춰 읽을 수 없다.
 */

/** 판정 결과. 서버 `DecisionResult` 와 같은 순서다. */
export const DECISION_RESULTS = ["ACCEPTED", "PARTIAL", "REJECTED"] as const

export type DecisionResult = (typeof DECISION_RESULTS)[number]

export const isDecisionResult = (value: unknown): value is DecisionResult =>
  (DECISION_RESULTS as readonly unknown[]).includes(value)

export const DECISION_LABEL: Record<DecisionResult, string> = {
  ACCEPTED: "수용",
  PARTIAL: "일부 지급정지",
  REJECTED: "불수용",
}

/** 판정이 지급정지를 줄이는가. 줄이는 판정만 조기 해제 근거를 요구한다(D29). */
export const isReleasingDecision = (result: DecisionResult): boolean =>
  result !== "REJECTED"

/** 이의제기 사유. 법 제7조제1항 각 호(D28). */
export const OBJECTION_CLAUSES = [1, 2, 3] as const

export type ObjectionClause = (typeof OBJECTION_CLAUSES)[number]

export const CLAUSE_LABEL: Record<ObjectionClause, string> = {
  1: "사기이용계좌 아님",
  2: "정당한 대가로 받은 돈",
  3: "피해금 편취에 쓰이지 않음",
}

/** 사유가 정하는 해제 범위(D28). 담당자가 고르는 값이 아니다. */
export const CLAUSE_SCOPE: Record<ObjectionClause, string> = {
  1: "수용 시 전부 해제",
  2: "수용 시 전부 해제",
  3: "수용 시 피해금만 남기고 해제",
}

export const formatClause = (clause: number): string => {
  const label = CLAUSE_LABEL[clause as ObjectionClause]
  return label ? `제${clause}호 ${label}` : `제${clause}호`
}

/** 해제 요건 점검 규칙 이름(서버 `GateRule`). 처음 보는 규칙은 코드를 그대로 보인다. */
export const GATE_RULE_LABEL: Record<string, string> = {
  SIMPLIFIED_EXCLUSION: "간소화 대상 제외",
  FRAUD_PATTERN: "사기 패턴",
  RELATIONSHIP: "관계 인정",
}

/** 규칙 근거 구분(D33). 수치는 공식 기준이 아니라 내부 기준이라는 것을 함께 밝힌다. */
export const RULE_BASIS_LABEL: Record<string, string> = {
  LAW_INTERNAL_METRIC: "법 기준 내부 수치화",
  REGULATOR_STANDARD: "당국 표준",
  INTERNAL: "내부 기준",
}

/** 해제 요건 점검이 낸 갈래(서버 `GateBranch`). */
export const GATE_BRANCH_LABEL: Record<string, string> = {
  FRAUD_PATTERN: "거래 기록상 사기 정황",
  NORMAL_ACCEPT: "거래 기록상 정상 거래",
  NORMAL_PARTIAL: "일부 지급정지 요건 충족",
  UNDETERMINED: "거래 기록으로 판단 불가",
}

/** 사건 기준 지급정지 상태(서버 `CaseStatus`). */
export const CASE_STATUS_LABEL: Record<string, string> = {
  STOPPED: "전부 지급정지",
  PARTIAL: "일부 지급정지",
  RELEASED: "지급정지 해제",
}

/** 이의제기 처리 상태(서버 `ObjectionStatus`). */
export const OBJECTION_STATUS_LABEL: Record<string, string> = {
  RECEIVED: "판정 대기",
  DECIDED: "판정 확정",
}

/** 표에 없는 코드는 코드 그대로 보인다. 빈칸으로 두면 값이 없다고 오인한다. */
export const labelOf = (labels: Record<string, string>, code: string) =>
  labels[code] ?? code

/** AI 분석 실행 상태(서버 `AgentRunStatus`). */
export const AGENT_RUN_STATUS_LABEL: Record<string, string> = {
  QUEUED: "대기",
  RUNNING: "분석 중",
  COMPLETED: "완료",
  FAILED: "실패",
}
