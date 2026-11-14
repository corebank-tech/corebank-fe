import type {
  FdsHeldTransferView,
  FdsInvestigationStep,
  FdsPolicy,
  FdsRiskStatus,
} from "@/entities/fds/model/fds-held-transfer-view"

const holdStep = (policy: FdsPolicy): FdsInvestigationStep => ({
  id: "hold",
  actor: "SERVER",
  title: "이체 보류",
  narration: `서버가 기표 전에 정책 ${policy}로 이체를 보류합니다.`,
  input: "고객 전체 출금계좌의 성공 이체와 현재 미기표 요청",
  output: `HOLD(${policy}) → HELD`,
  durationMs: 1_500,
  reveal: { agentFinding: undefined },
})

const agentStart: FdsInvestigationStep = {
  id: "agent-start",
  actor: "AGENT",
  title: "조사 시작",
  narration: "HELD 확정 이후 Agent가 비동기로 사건을 조사합니다.",
  input: "보류 사건 ID와 서버 정책 근거",
  output: "조사 작업 접수",
  durationMs: 1_100,
}

const historyStep = (ids: string[]): FdsInvestigationStep => ({
  id: "history",
  actor: "AGENT",
  title: "거래 이력 Tool 조회",
  narration: "Agent가 성공 이체의 거래 ID와 시각을 조회합니다.",
  input: "인증된 보류 사건 ID",
  output: `${ids.length}건 조회`,
  durationMs: 1_600,
  tool: "get_transfer_history",
  reveal: { history: ids },
})

const recipientStep: FdsInvestigationStep = {
  id: "recipient",
  actor: "AGENT",
  title: "수취인 맥락 Tool 조회",
  narration: "거래 이력만으로 설명하기 어려운 수취인 관계를 추가 확인합니다.",
  input: "보류 사건에 연결된 수취인",
  output: "추가 확인 필요",
  durationMs: 1_600,
  tool: "get_recipient_context",
  reveal: {
    recipientContext:
      "가상 조회 결과: 최근 성공 이체 외 관계 정보는 확인되지 않음",
  },
}

const findingStep = (finding: string): FdsInvestigationStep => ({
  id: "finding",
  actor: "AGENT",
  title: "Agent 추가 확인 사항",
  narration: "서버 보류 사유와 구분되는 관찰 사실을 담당자에게 전달합니다.",
  input: "Tool 조회 결과",
  output: "담당자 확인 질문 작성",
  durationMs: 1_400,
  reveal: { agentFinding: finding },
})

const riskStep = (status: FdsRiskStatus): FdsInvestigationStep => ({
  id: "risk-check",
  actor: "SERVER",
  title: "위험 계좌 재검증",
  narration: "활성 위험 계좌 데이터로 수취계좌를 다시 판정합니다.",
  input: "보류 원본과 활성 위험 데이터셋",
  output:
    status === "MATCH"
      ? "MATCH · 고객 통화 없이 거절만 허용"
      : `${status} · 고객 확인 후 승인 또는 거절`,
  durationMs: 1_200,
})

const decisionStep: FdsInvestigationStep = {
  id: "human-decision",
  actor: "HUMAN",
  title: "담당자 판정",
  narration: "위험 계좌 판정과 조사 결과에 따라 허용된 조치를 선택합니다.",
  input: "서버 근거, Agent 결과, 위험 계좌 판정, 고객 확인 결과",
  output: "담당자 선택 대기",
  durationMs: 0,
}

const policyAReason =
  "신규 수취인에게 50만 원씩 앞선 두 건이 성공했습니다. 현재 요청을 포함하면 10분 창에서 3건·150만 원이며 반복 묶음에 망설임이 있습니다."
const policyBReason =
  "현재 요청을 포함하면 10분 창에서 3건·300만 원으로 정책 B가 성립합니다."

export const FDS_HELD_TRANSFER_FIXTURES: FdsHeldTransferView[] = [
  {
    id: "policy-a-risk-match",
    caseNo: "FDS-DEMO-A01",
    flowId: "flow-demo-a-20261108-001",
    receivedAt: "2026-11-08T09:10:00+09:00",
    customer: "고객 A",
    withdrawalAccountNumber: "110-***-1201",
    recipientBankCode: "088",
    recipientBankName: "신한은행",
    recipientAccountNumber: "088******0392",
    recipientName: "고객 A",
    amount: 500_000,
    policy: "A",
    serverHoldReason: policyAReason,
    agentStatus: "COMPLETED",
    agentFinding:
      "조회된 두 성공 이체 모두 같은 수취계좌입니다. 수취인과 송금 목적을 확인할 필요가 있습니다.",
    sourceNotice:
      "화면 검증을 위한 fixture이며 실제 위험 계좌 조회 결과가 아닙니다.",
    riskStatus: "MATCH",
    riskDatasetVersion: "demo-risk-v1",
    riskRecordId: "RISK-DEMO-0001",
    riskReason: "활성 위험 계좌 목록의 은행코드와 계좌번호가 일치합니다.",
    steps: [
      holdStep("A"),
      agentStart,
      historyStep(["REF-A-101", "REF-A-102"]),
      recipientStep,
      findingStep(
        "성공 이체가 모두 같은 수취계좌이며 송금 목적 확인이 필요합니다.",
      ),
      riskStep("MATCH"),
      decisionStep,
    ],
  },
  {
    id: "policy-b-no-match",
    caseNo: "FDS-DEMO-B01",
    flowId: "flow-demo-b-20261108-001",
    receivedAt: "2026-11-08T09:12:00+09:00",
    customer: "고객 B",
    withdrawalAccountNumber: "110-***-2202",
    recipientBankCode: "088",
    recipientBankName: "신한은행",
    recipientAccountNumber: "088******7730",
    recipientName: "고객 B",
    amount: 1_000_000,
    policy: "B",
    serverHoldReason: policyBReason,
    agentStatus: "COMPLETED",
    agentFinding:
      "반복된 송금으로 수취인과 거래 목적에 대한 고객 확인이 필요합니다.",
    sourceNotice:
      "화면 검증을 위한 fixture이며 실제 위험 계좌 조회 결과가 아닙니다.",
    riskStatus: "NO_MATCH",
    riskDatasetVersion: "demo-risk-v1",
    riskReason: "활성 위험 계좌 목록에서 일치하는 계좌가 없습니다.",
    steps: [
      holdStep("B"),
      agentStart,
      historyStep(["REF-B-201", "REF-B-202"]),
      recipientStep,
      findingStep("수취인과 거래 목적에 대한 고객 확인이 필요합니다."),
      riskStep("NO_MATCH"),
      decisionStep,
    ],
  },
  {
    id: "agent-failure-unavailable",
    caseNo: "FDS-DEMO-E01",
    flowId: "flow-demo-e-20261108-001",
    receivedAt: "2026-11-08T09:11:00+09:00",
    customer: "고객 C",
    withdrawalAccountNumber: "110-***-3303",
    recipientBankCode: "088",
    recipientBankName: "신한은행",
    recipientAccountNumber: "088******5512",
    recipientName: "고객 C",
    amount: 1_000_000,
    policy: "B",
    serverHoldReason: policyBReason,
    agentStatus: "FAILED",
    sourceNotice:
      "조사 장애 fixture이며 Agent 실패와 관계없이 HELD가 유지됩니다.",
    riskStatus: "UNAVAILABLE",
    riskReason: "활성 위험 데이터셋을 확인할 수 없습니다.",
    steps: [
      holdStep("B"),
      agentStart,
      {
        id: "failed",
        actor: "AGENT",
        title: "Agent 조사 실패",
        narration: "Tool 호출 오류로 Agent 보고서를 만들지 못했습니다.",
        input: "거래 이력 조회 요청",
        output: "FAILED · HELD 유지",
        durationMs: 1_300,
        tool: "get_transfer_history",
        reveal: {
          agentError:
            "거래 이력 Tool 응답 실패. 서버 보류 근거로 수동 검토합니다.",
        },
      },
      riskStep("UNAVAILABLE"),
      decisionStep,
    ],
  },
]

export const findFdsHeldTransfer = (id?: string) =>
  FDS_HELD_TRANSFER_FIXTURES.find((item) => item.id === id)
