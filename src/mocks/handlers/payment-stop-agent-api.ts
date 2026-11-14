import { delay, http } from "msw"
import type {
  AgentRunResponse,
  AgentRunStepResponse,
  ReviewDraftResponse,
} from "@/shared/api/generated"
import { requireMockPermission } from "@/mocks/handlers/auth"
import {
  allowedResults,
  readMockObjection,
  type MockObjection,
} from "@/mocks/handlers/payment-stop-api"
import { fail, ok } from "@/mocks/lib/envelope"
import { readStore, toLocalDateTime, writeStore } from "@/mocks/lib/mock-store"

/**
 * 이의제기 AI 분석 API(서버 Draft PR #919) MSW 목.
 *
 * 서버도 워커도 없이 "단계가 하나씩 도착하는" 화면을 보이기 위한 것이다. 실행마다 시작
 * 시각을 저장해 두고, 요청이 올 때마다 그 뒤 흐른 시간만큼의 단계만 돌려준다. 그래서
 * 1초 폴링으로 보면 단계가 차례로 붙는다.
 *
 * - 이의제기 3, 1: 이틀 전에 끝난 실행(완료된 타임라인)
 * - 이의제기 2: 처음 조회할 때 시작해 약 12초 동안 흐르는 실행. AI 판정안은 "판단 불가",
 *   서버 규칙은 "사기 정황"이라 갈래가 다르다는 경고가 뜬다
 * - 대리 접수로 만든 이의제기: 처음 조회할 때 시작하는 실행
 * - 재분석 요청: 같은 각본으로 새 실행을 시작
 *
 * 단계 내용은 서버 가명 처리 규칙(상대 계좌는 `CP-` 가명 키)을 흉내 낸다.
 */

const MOCK_LATENCY_MS = 120
const STORE_KEY = "payment-stop:agent-runs"
/** 대기열에 머무는 시간. 이 동안 실행 상태는 QUEUED 다 */
const QUEUE_MS = 1_500
const ENDED_LONG_AGO_MS = 2 * 24 * 60 * 60 * 1000
const MODEL = "claude-opus-5-5"
const PROMPT_VERSION = "objection-2026-11-05.1"
const RULES_VERSION = "2026-11-03.1"

type MockRun = { runId: number; startMs: number }
type RunStore = Record<string, MockRun[]>

/** 각본 한 줄. `endMs` 는 실행 시작(대기열을 나온 시각)부터 이 단계가 끝나는 시각이다. */
type ScriptStep = Omit<
  AgentRunStepResponse,
  "seq" | "startedAt" | "endedAt" | "status"
> & { endMs: number; durationMs: number }

type Script = {
  steps: ScriptStep[]
  draft: { branch: string; content: Record<string, unknown> }
  costMicroUsd: number
  inputTokens: number
  outputTokens: number
}

/** 서버 LocalDateTime 처럼 밀리초까지 적는다. 초 단위로 자르면 단계 소요 시간이 0초가 된다. */
const toServerTime = (millis: number) => {
  const date = new Date(millis)
  return `${toLocalDateTime(date)}.${String(date.getMilliseconds()).padStart(3, "0")}`
}

const disputedNumbers = (objection: MockObjection) =>
  objection.disputedTransfers.map((t) => t.transactionNumber ?? "")

const ruleNumbers = (objection: MockObjection, rule: string) =>
  objection.rules?.find((item) => item.rule === rule)?.transactionNumbers ?? []

const gateStep = (
  objection: MockObjection,
  agentBranch: string,
  endMs: number,
): ScriptStep => ({
  endMs,
  durationMs: 40,
  type: "GATE_EVALUATED",
  title: "해제 요건 점검",
  summary:
    objection.branch === agentBranch
      ? "서버 규칙 결과가 판정안 갈래와 같음"
      : "서버 규칙 결과가 판정안 갈래와 다름",
  detail: {
    branch: objection.branch,
    agentBranch,
    rulesVersion: RULES_VERSION,
    allowedResults: allowedResults(objection),
    rules: (objection.rules ?? []).map((rule) => ({
      rule: rule.rule,
      matched: rule.matched,
      transactionNumbers: rule.transactionNumbers,
      detail: rule.detail,
    })),
  },
})

const commonHead = (objection: MockObjection): ScriptStep[] => [
  {
    endMs: 600,
    durationMs: 300,
    type: "CLAIMED",
    title: "분석 작업 시작",
    summary: "대기열에서 이 이의제기를 가져옴",
    detail: { attempt: 1 },
  },
  {
    endMs: 1_800,
    durationMs: 900,
    type: "CONTEXT_LOADED",
    title: "소명과 다툼 거래 확인",
    summary: `사유 제${objection.clause}호, 다툼 거래 ${objection.disputedTransfers.length}건, 원장 조회 기간 180일`,
    detail: {
      clause: objection.clause,
      disputedTransactionNumbers: disputedNumbers(objection),
      ledgerFrom: "2026-05-01T00:00:00",
      ledgerTo: "2026-11-01T00:00:00",
      simplifiedRequested: objection.simplifiedRequested,
      litigationPending: objection.litigationPending,
    },
  },
]

/** 금액이 적힌 판독 영역. 서류에서 나온 주장(계약 v2 §6 `source=DOCUMENT`)을 만든다. */
const AMOUNT_TEXT = /\d[\d,]*원/

/**
 * 판독을 마친 첫 증빙 그림과 그 안의 금액 영역. 없으면 `null` 이라 서류 판독 단계와
 * 서류 주장을 넣지 않는다.
 */
const documentEvidence = (objection: MockObjection) => {
  const document = objection.documents.find(
    (item) =>
      item.kind === "EVIDENCE" &&
      item.ocrStatus === "DONE" &&
      item.contentType.startsWith("image/"),
  )
  const regions = document?.pages?.[0]?.regions ?? []
  const region = regions.find((item) => AMOUNT_TEXT.test(item.text ?? ""))
  if (!document || !region) return null
  return {
    document,
    regionCount: regions.length,
    lowConfidenceCount: regions.filter((item) => (item.confidence ?? 1) < 0.9)
      .length,
    claim: {
      text: `서류에 적힌 금액은 ${region.text?.match(AMOUNT_TEXT)?.[0]}이다`,
      quote: region.text,
      source: "DOCUMENT",
      documentId: document.documentId,
      regionIndex: region.index,
    },
  }
}

/** 소명 문장을 그대로 주장으로 쓴다. 각본이 이의제기마다 소명을 따로 갖지 않아서다. */
const sentenceClaims = (objection: MockObjection) =>
  objection.statement
    .split(/(?<=\.)\s+/)
    .filter(Boolean)
    .map((sentence) => ({
      text: sentence.replace(/(입니다|습니다)\.$/, "").trim(),
      quote: sentence,
      source: "STATEMENT",
      documentId: null,
      regionIndex: null,
    }))

const RELATIONSHIP_CLAIMS = [
  {
    text: "거래처에 납품한 물품 대금이다",
    quote: "거래처에 납품한 물품 대금을 받은 것입니다.",
    source: "STATEMENT",
    documentId: null,
    regionIndex: null,
  },
  {
    text: "같은 거래처와 반년 넘게 매달 거래했다",
    quote: "같은 거래처와 반년 넘게 매달 거래해 왔습니다.",
    source: "STATEMENT",
    documentId: null,
    regionIndex: null,
  },
]

/** 정상 거래 관계가 원장으로 확인되는 각본(이의제기 3, 1, 5). */
const relationshipScript = (objection: MockObjection): Script => {
  const relation = ruleNumbers(objection, "RELATIONSHIP")
  const disputed = disputedNumbers(objection)
  const evidence = documentEvidence(objection)
  const claims = [
    ...(objection.objectionId === 5
      ? sentenceClaims(objection)
      : RELATIONSHIP_CLAIMS),
    ...(evidence ? [evidence.claim] : []),
  ]
  const ocrStep: ScriptStep[] = evidence
    ? [
        {
          endMs: 2_050,
          durationMs: 220,
          type: "OCR",
          title: "첨부 서류 판독",
          summary: `${evidence.document.fileName}에서 글자 영역 ${evidence.regionCount}개`,
          detail: {
            documentId: evidence.document.documentId,
            pages: 1,
            regions: evidence.regionCount,
            lowConfidenceRegions: evidence.lowConfidenceCount,
            engine: "paddleocr-korean",
          },
        },
      ]
    : []
  return {
    costMicroUsd: 41_230,
    inputTokens: 18_420,
    outputTokens: 1_310,
    steps: [
      ...commonHead(objection),
      ...ocrStep,
      {
        endMs: 3_600,
        durationMs: 1_500,
        type: "CLAIM_EXTRACTED",
        title: `소명과 서류에서 주장 ${claims.length}건 정리`,
        summary: evidence
          ? "소명의 거래 주장과 서류에 적힌 금액"
          : "소명의 거래 주장",
        detail: { claims },
      },
      {
        endMs: 5_400,
        durationMs: 1_400,
        type: "TOOL_CALL",
        title: "다툼 거래 전후 원장 조회",
        summary: "다툼 입금 뒤 1시간 안 출금 없음",
        detail: {
          tool: "get_ledger",
          reason: "다툼 입금 직후 돈이 빠져나갔는지 확인",
          args: { from: "2026-10-23T14:05:12", to: "2026-10-25T14:05:12" },
          resultSummary: "입금 1건, 같은 날 출금 없음",
          transactionNumbers: disputed,
        },
      },
      {
        endMs: 7_600,
        durationMs: 1_800,
        type: "TOOL_CALL",
        title: "송금인과의 과거 거래 조회",
        summary: "다툼 이전 180일 안 관계 거래 3회",
        detail: {
          tool: "get_ledger",
          reason: "주장 2(반년 넘은 정기 거래)를 원장으로 확인",
          args: { counterparty: "CP-3f9a12c0" },
          resultSummary: "다툼 150일 전부터 3회, 최대 900,000원",
          transactionNumbers: relation,
        },
      },
      {
        endMs: 9_800,
        durationMs: 2_000,
        type: "DRAFT_SUBMITTED",
        title: "판정안 제출",
        summary: "거래 기록상 정상 거래, 근거 거래 3건",
        detail: {
          branch: "NORMAL_ACCEPT",
          evidenceTransactionNumbers: relation,
          missingDocuments: ["거래처 사업자등록증"],
          model: MODEL,
          costMicroUsd: 41_230,
        },
      },
      gateStep(objection, "NORMAL_ACCEPT", 9_900),
    ],
    draft: {
      branch: "NORMAL_ACCEPT",
      content: {
        evidenceTransactionNumbers: relation,
        missingDocuments: ["거래처 사업자등록증"],
        claims,
        contradictions: [],
        followUps: ["공급 계약서의 거래처명이 송금인과 같은지 확인"],
        noticeDraft:
          "고객님의 이의제기를 검토한 결과, 송금인과의 기존 거래가 확인되어 지급정지 해제를 검토하고 있습니다. 거래처 사업자등록증을 제출해 주시기 바랍니다.",
      },
    },
  }
}

/** 사기 패턴이 원장에 드러나는 각본(이의제기 2). AI 갈래는 판단 불가라 서버와 다르다. */
const fraudScript = (objection: MockObjection): Script => {
  const pattern = ruleNumbers(objection, "FRAUD_PATTERN")
  return {
    costMicroUsd: 52_870,
    inputTokens: 23_105,
    outputTokens: 1_744,
    steps: [
      ...commonHead(objection),
      {
        endMs: 3_400,
        durationMs: 1_300,
        type: "CLAIM_EXTRACTED",
        title: "소명에서 주장 2건 정리",
        summary: "모르는 입금이라는 주장과 계좌를 빌려준 적 없다는 주장",
        detail: {
          claims: [
            {
              text: "모르는 사람이 보낸 돈이다",
              quote: "모르는 사람이 보낸 돈입니다.",
            },
            {
              text: "계좌를 다른 사람에게 빌려준 적이 없다",
              quote: "계좌를 다른 사람에게 빌려준 적이 없습니다.",
            },
          ],
        },
      },
      {
        endMs: 5_600,
        durationMs: 1_900,
        type: "TOOL_CALL",
        title: "다툼 거래 전후 원장 조회",
        summary: "24시간 안 송금인 4명, 입금 대부분이 1시간 안에 타행 출금",
        detail: {
          tool: "get_ledger",
          reason: "다툼 입금 전후에 다른 입금과 즉시 출금이 있었는지 확인",
          args: { from: "2026-10-29T21:40:03", to: "2026-10-31T21:52:47" },
          resultSummary:
            "입금 3,450,000원 중 3,150,000원이 1시간 안에 타행 출금",
          transactionNumbers: pattern,
        },
      },
      {
        endMs: 7_400,
        durationMs: 1_500,
        type: "CONTRADICTION",
        title: "주장과 원장 대조",
        summary: "빌려준 적 없다는 주장과 달리 입금 직후 출금이 반복됨",
        detail: {
          claim: "계좌를 다른 사람에게 빌려준 적이 없다",
          ledgerFact:
            "다툼 입금 2건을 포함한 입금 4건이 모두 1시간 안에 타행으로 출금됨",
          transactionNumbers: pattern,
        },
      },
      {
        endMs: 8_800,
        durationMs: 1_100,
        type: "TOOL_CALL",
        title: "송금인과의 과거 거래 조회",
        summary: "타행 송금이라 당행 관계 거래 없음",
        detail: {
          tool: "get_ledger",
          reason: "송금인과 이전 거래가 있었는지 확인",
          args: { counterparty: null },
          resultSummary: "당행 기록 0건, 확인 불가",
          transactionNumbers: [],
        },
      },
      {
        endMs: 11_200,
        durationMs: 2_200,
        type: "DRAFT_SUBMITTED",
        title: "판정안 제출",
        summary: "거래 기록으로 판단 불가, 외부 확인 필요",
        detail: {
          branch: "UNDETERMINED",
          evidenceTransactionNumbers: pattern,
          missingDocuments: ["다른 은행 거래내역서", "통장 사용 경위서"],
          model: MODEL,
          costMicroUsd: 52_870,
        },
      },
      gateStep(objection, "UNDETERMINED", 11_300),
    ],
    draft: {
      branch: "UNDETERMINED",
      content: {
        evidenceTransactionNumbers: pattern,
        missingDocuments: ["다른 은행 거래내역서", "통장 사용 경위서"],
        claims: [
          {
            text: "모르는 사람이 보낸 돈이다",
            quote: "모르는 사람이 보낸 돈입니다.",
          },
          {
            text: "계좌를 다른 사람에게 빌려준 적이 없다",
            quote: "계좌를 다른 사람에게 빌려준 적이 없습니다.",
          },
        ],
        contradictions: [
          {
            claim: "계좌를 다른 사람에게 빌려준 적이 없다",
            ledgerFact:
              "다툼 입금 2건을 포함한 입금 4건이 모두 1시간 안에 타행으로 출금됨",
            transactionNumbers: pattern,
          },
        ],
        followUps: [
          "출금된 타행 계좌의 명의인 확인 요청",
          "수사기관에 가담 여부 회신 요청",
        ],
        noticeDraft:
          "고객님의 이의제기를 검토 중입니다. 입금 직후 출금 경위를 확인하기 위해 다른 은행 거래내역서와 통장 사용 경위서를 제출해 주시기 바랍니다.",
      },
    },
  }
}

/** 대리 접수로 새로 만든 이의제기의 각본. 원장 근거가 없어 판단 불가로 끝난다. */
const genericScript = (objection: MockObjection): Script => ({
  costMicroUsd: 30_410,
  inputTokens: 12_002,
  outputTokens: 980,
  steps: [
    ...commonHead(objection),
    {
      endMs: 3_200,
      durationMs: 1_200,
      type: "CLAIM_EXTRACTED",
      title: "소명에서 주장 1건 정리",
      summary: "소명 첫 문장을 주장으로 정리",
      detail: {
        claims: [
          {
            text: objection.statement.slice(0, 40),
            quote: objection.statement.slice(0, 80),
          },
        ],
      },
    },
    {
      endMs: 5_000,
      durationMs: 1_500,
      type: "TOOL_CALL",
      title: "다툼 거래 전후 원장 조회",
      summary: "다툼 입금 외 관련 거래 없음",
      detail: {
        tool: "get_ledger",
        reason: "다툼 입금 전후의 입출금 확인",
        args: {},
        resultSummary: "다툼 입금 외 거래 0건",
        transactionNumbers: disputedNumbers(objection),
      },
    },
    {
      endMs: 6_800,
      durationMs: 1_600,
      type: "DRAFT_SUBMITTED",
      title: "판정안 제출",
      summary: "거래 기록으로 판단 불가",
      detail: {
        branch: "UNDETERMINED",
        evidenceTransactionNumbers: [],
        missingDocuments: ["거래 사실을 보여 주는 계약서나 영수증"],
        model: MODEL,
        costMicroUsd: 30_410,
      },
    },
    gateStep(objection, "UNDETERMINED", 6_900),
  ],
  draft: {
    branch: "UNDETERMINED",
    content: {
      evidenceTransactionNumbers: [],
      missingDocuments: ["거래 사실을 보여 주는 계약서나 영수증"],
      claims: [{ text: objection.statement.slice(0, 40), quote: null }],
      contradictions: [],
      followUps: ["명의인에게 거래 경위 추가 소명 요청"],
      noticeDraft: null,
    },
  },
})

const scriptFor = (objection: MockObjection): Script => {
  if (objection.branch === "FRAUD_PATTERN") return fraudScript(objection)
  if ([1, 3, 5].includes(objection.objectionId)) {
    return relationshipScript(objection)
  }
  return genericScript(objection)
}

/** 처음부터 끝난 실행으로 두는 이의제기. 나머지는 처음 조회할 때 실행이 시작된다. */
const COMPLETED_SEEDS = new Set([1, 3, 4, 5])

const readRuns = (objection: MockObjection): MockRun[] => {
  const store = readStore<RunStore>(STORE_KEY, {})
  const runs = store[objection.objectionId]
  if (runs) return runs
  const created: MockRun[] = [
    {
      runId: objection.objectionId * 100 + 1,
      startMs: COMPLETED_SEEDS.has(objection.objectionId)
        ? Date.now() - ENDED_LONG_AGO_MS
        : Date.now(),
    },
  ]
  writeStore(STORE_KEY, { ...store, [objection.objectionId]: created })
  return created
}

const appendRun = (objection: MockObjection): MockRun => {
  const store = readStore<RunStore>(STORE_KEY, {})
  const runs = readRuns(objection)
  const run = { runId: (runs[0]?.runId ?? 0) + 1, startMs: Date.now() }
  writeStore(STORE_KEY, { ...store, [objection.objectionId]: [run, ...runs] })
  return run
}

/** 지금 시각까지 끝난 단계와 실행 상태. */
const project = (objection: MockObjection, run: MockRun) => {
  const script = scriptFor(objection)
  const runStartMs = run.startMs + QUEUE_MS
  const elapsed = Date.now() - runStartMs
  const steps: AgentRunStepResponse[] = script.steps
    .filter((step) => step.endMs <= elapsed)
    .map(({ endMs, durationMs, ...step }, index) => ({
      ...step,
      seq: index + 1,
      status: "DONE",
      startedAt: toServerTime(runStartMs + endMs - durationMs),
      endedAt: toServerTime(runStartMs + endMs),
    }))
  const lastEndMs = script.steps.at(-1)?.endMs ?? 0
  const isComplete = elapsed >= lastEndMs
  const status = elapsed < 0 ? "QUEUED" : isComplete ? "COMPLETED" : "RUNNING"
  const response: AgentRunResponse = {
    runId: run.runId,
    status,
    attempt: status === "QUEUED" ? 0 : 1,
    model: isComplete ? MODEL : undefined,
    promptVersion: isComplete ? PROMPT_VERSION : undefined,
    inputTokens: isComplete ? script.inputTokens : undefined,
    outputTokens: isComplete ? script.outputTokens : undefined,
    costMicroUsd: isComplete ? script.costMicroUsd : undefined,
    queuedAt: toServerTime(run.startMs),
    startedAt: status === "QUEUED" ? undefined : toServerTime(runStartMs),
    endedAt: isComplete ? toServerTime(runStartMs + lastEndMs) : undefined,
  }
  return { response, steps, script, isComplete }
}

/**
 * 목록 요약 칸(계약 v2 `latestRunStatus`, `latestRunLastStepTitle`). 서버는 목록 응답에 싣고,
 * 목은 상세 타임라인과 같은 각본으로 지금 시각의 상태를 계산한다.
 */
export const latestRunSummary = (objection: MockObjection) => {
  const run = readRuns(objection)[0]
  if (!run) return { status: undefined, lastStepTitle: undefined }
  const view = project(objection, run)
  return {
    status: view.response.status,
    lastStepTitle: view.steps.at(-1)?.title,
  }
}

const notFound = () => fail("PST0202", "이의제기를 찾을 수 없습니다.", 404)

const findObjection = (params: Record<string, unknown>) =>
  readMockObjection(Number(params.objectionId))

export const paymentStopAgentApiHandlers = [
  http.get("*/admin/objections/:objectionId/agent-runs", async ({ params }) => {
    await delay(MOCK_LATENCY_MS)
    const denied = requireMockPermission("PAYMENT_STOP_READ")
    if (denied) return denied
    const objection = findObjection(params)
    if (!objection) return notFound()
    return ok(
      readRuns(objection).map((run) => project(objection, run).response),
    )
  }),

  http.get(
    "*/admin/objections/:objectionId/agent-runs/:runId/steps",
    async ({ params, request }) => {
      await delay(MOCK_LATENCY_MS)
      const denied = requireMockPermission("PAYMENT_STOP_READ")
      if (denied) return denied
      const objection = findObjection(params)
      if (!objection) return notFound()
      const run = readRuns(objection).find(
        (item) => item.runId === Number(params.runId),
      )
      if (!run) return fail("PST0203", "분석 실행을 찾을 수 없습니다.", 404)
      const after = Number(new URL(request.url).searchParams.get("after") ?? 0)
      return ok(
        project(objection, run).steps.filter((step) => (step.seq ?? 0) > after),
      )
    },
  ),

  http.get(
    "*/admin/objections/:objectionId/review-draft",
    async ({ params }) => {
      await delay(MOCK_LATENCY_MS)
      const denied = requireMockPermission("PAYMENT_STOP_READ")
      if (denied) return denied
      const objection = findObjection(params)
      if (!objection) return notFound()
      const completed = readRuns(objection)
        .map((run) => ({ run, view: project(objection, run) }))
        .find(({ view }) => view.isComplete)
      if (!completed) return ok(null)
      const draft: ReviewDraftResponse = {
        runId: completed.run.runId,
        branch: completed.view.script.draft.branch,
        content: completed.view.script.draft.content,
        submittedAt: completed.view.response.endedAt,
      }
      return ok(draft)
    },
  ),

  http.post(
    "*/admin/objections/:objectionId/review-requests",
    async ({ params, request }) => {
      await delay(MOCK_LATENCY_MS)
      const denied = requireMockPermission("PAYMENT_STOP_WRITE")
      if (denied) return denied
      if (!request.headers.get("Idempotency-Key")) {
        return fail("CMN0002", "필수 입력값이 누락되었습니다.", 400)
      }
      const objection = findObjection(params)
      if (!objection) return notFound()
      if (objection.decision) {
        return fail("PST0302", "이미 판정이 확정된 이의제기입니다.", 409)
      }
      const latest = readRuns(objection)[0]
      if (latest && !project(objection, latest).isComplete) {
        return fail(
          "PST0306",
          "진행 중인 분석이 있어 다시 요청할 수 없습니다.",
          409,
        )
      }
      return ok({ runId: appendRun(objection).runId })
    },
  ),
]
