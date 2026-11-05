import { delay, http } from "msw"
import type {
  DecisionRequest,
  DecisionResponse,
  ObjectionDetailResponse,
  ObjectionSummaryResponse,
  ReceiveRequest,
  RegisterRequest,
} from "@/shared/api/generated"
import { requireMockPermission } from "@/mocks/handlers/auth"
import { fail, ok } from "@/mocks/lib/envelope"
import { readStore, toLocalDateTime, writeStore } from "@/mocks/lib/mock-store"
import { addDays } from "@/shared/lib/date"
import { getToday } from "@/shared/config/clock"

/**
 * 지급정지 사건과 이의제기 심사 API(서버 `paymentstop`, Draft PR #916) MSW 목.
 *
 * 화면 흐름(목록 → 상세 → 판정 확정, 대리 접수)을 서버 없이 돌리기 위한 것이다.
 * 해제 요건 점검은 서버처럼 원장으로 계산하지 않는다. 사건마다 결과를 미리 적어 두고,
 * 대리 접수로 새로 만든 사건은 "판단 불가"로 둔다. 판정 허용 조건(사유 조항, 소송 계속)은
 * 서버 `GateResult.allowsRelease` 와 같게 계산한다.
 *
 * 상태는 sessionStorage 에 둔다(새로고침해도 유지, 탭을 닫으면 처음으로).
 */

const MOCK_LATENCY_MS = 200
const STORE_KEY = "payment-stop:objections"
const RULES_VERSION = "2026-11-03.1"
const ACCESS_REASONS = ["CUSTOMER_REQUEST", "INCIDENT", "AUDIT", "OPERATION"]

type MockObjection = Required<
  Pick<
    ObjectionDetailResponse,
    | "objectionId"
    | "caseId"
    | "accountId"
    | "caseStatus"
    | "objectionDeadline"
    | "disputedTransfers"
    | "clause"
    | "statement"
    | "simplifiedRequested"
    | "idCopyConfirmed"
    | "litigationPending"
    | "objectionStatus"
    | "receivedAt"
  >
> & {
  senderAccountId: number | null
  branch: string
  rules: NonNullable<ObjectionDetailResponse["gate"]>["rules"]
  decision: DecisionResponse | null
}

type MockState = {
  objections: MockObjection[]
  /** 사건 등록만 하고 아직 이의제기를 받지 않은 사건 */
  pendingCases: Pick<
    MockObjection,
    "caseId" | "accountId" | "objectionDeadline" | "disputedTransfers"
  >[]
}

/** 서버 거래 번호 모양(영문 대문자와 숫자 20자리). */
const transactionNumber = (date: string, seq: number) =>
  `TR${date.replaceAll("-", "")}${String(seq).padStart(10, "0")}`

const at = (date: string, time: string) => `${date}T${time}`

const simplifiedRule = (requested: boolean) => ({
  rule: "SIMPLIFIED_EXCLUSION",
  description: "지급정지 이력이 있으면 간소화 대상에서 제외",
  basis: "REGULATOR_STANDARD",
  matched: false,
  transactionNumbers: [],
  detail: requested ? "간소화 신청, 지급정지 이력 없음" : "간소화 신청 없음",
})

const fraudRule = (matched: boolean, used: string[], detail: string) => ({
  rule: "FRAUD_PATTERN",
  description: "다툼 거래 전후 다수 송금인 입금과 즉시 출금",
  basis: "LAW_INTERNAL_METRIC",
  matched,
  transactionNumbers: used,
  detail,
})

const relationshipRule = (
  matched: boolean,
  used: string[],
  detail: string,
) => ({
  rule: "RELATIONSHIP",
  description: "송금인과 명의인의 다툼 이전 지속 거래",
  basis: "INTERNAL",
  matched,
  transactionNumbers: used,
  detail,
})

const seed = (): MockState => {
  const d1 = addDays(getToday(), -12)
  const d2 = addDays(getToday(), -6)
  const d3 = addDays(getToday(), -20)
  const deadline = addDays(getToday(), 40)
  return {
    pendingCases: [],
    objections: [
      {
        objectionId: 3,
        caseId: 13,
        accountId: 2003,
        senderAccountId: 3101,
        caseStatus: "STOPPED",
        objectionDeadline: deadline,
        disputedTransfers: [
          {
            transactionNumber: transactionNumber(d1, 31),
            amount: 1_200_000,
            occurredAt: at(d1, "14:05:12"),
          },
        ],
        clause: 2,
        statement:
          "거래처에 납품한 물품 대금을 받은 것입니다. 같은 거래처와 반년 넘게 매달 거래해 왔습니다.",
        simplifiedRequested: false,
        idCopyConfirmed: true,
        litigationPending: false,
        objectionStatus: "RECEIVED",
        receivedAt: at(addDays(getToday(), -2), "10:21:40"),
        branch: "NORMAL_ACCEPT",
        rules: [
          simplifiedRule(false),
          fraudRule(
            false,
            [transactionNumber(d1, 31)],
            "송금인 1명(기준 3명 이상), 즉시 출금 0원 / 입금 1200000원(기준 80% 이상)",
          ),
          relationshipRule(
            true,
            [
              transactionNumber(addDays(d1, -150), 3),
              transactionNumber(addDays(d1, -90), 7),
              transactionNumber(addDays(d1, -35), 9),
            ],
            "관계 거래 3회(기준 3회 이상), 기간 115일(기준 30일 이상), 다툼보다 150일 앞섬(기준 30일 이상), 다툼 1200000원 / 최대 900000원 × 5",
          ),
        ],
        decision: null,
      },
      {
        objectionId: 2,
        caseId: 12,
        accountId: 2002,
        senderAccountId: null,
        caseStatus: "STOPPED",
        objectionDeadline: deadline,
        disputedTransfers: [
          {
            transactionNumber: transactionNumber(d2, 21),
            amount: 950_000,
            occurredAt: at(d2, "21:40:03"),
          },
          {
            transactionNumber: transactionNumber(d2, 22),
            amount: 1_500_000,
            occurredAt: at(d2, "21:52:47"),
          },
        ],
        clause: 1,
        statement:
          "모르는 사람이 보낸 돈입니다. 계좌를 다른 사람에게 빌려준 적이 없습니다.",
        simplifiedRequested: false,
        idCopyConfirmed: true,
        litigationPending: false,
        objectionStatus: "RECEIVED",
        receivedAt: at(addDays(getToday(), -1), "16:02:11"),
        branch: "FRAUD_PATTERN",
        rules: [
          simplifiedRule(false),
          fraudRule(
            true,
            [
              transactionNumber(d2, 21),
              transactionNumber(d2, 22),
              transactionNumber(d2, 23),
              transactionNumber(d2, 24),
            ],
            "송금인 4명(기준 3명 이상), 즉시 출금 3150000원 / 입금 3450000원(기준 80% 이상)",
          ),
          relationshipRule(
            false,
            [],
            "타행 송금이라 당행 관계 거래를 볼 수 없음",
          ),
        ],
        decision: null,
      },
      {
        objectionId: 1,
        caseId: 11,
        accountId: 2001,
        senderAccountId: 3001,
        caseStatus: "PARTIAL",
        objectionDeadline: deadline,
        disputedTransfers: [
          {
            transactionNumber: transactionNumber(d3, 11),
            amount: 300_000,
            occurredAt: at(d3, "09:12:30"),
          },
        ],
        clause: 3,
        statement:
          "받은 돈은 생활비 계좌로 옮기지 않고 그대로 두었습니다. 다른 입금은 급여입니다.",
        simplifiedRequested: false,
        idCopyConfirmed: true,
        litigationPending: false,
        objectionStatus: "DECIDED",
        receivedAt: at(addDays(getToday(), -9), "11:45:00"),
        branch: "NORMAL_ACCEPT",
        rules: [
          simplifiedRule(false),
          fraudRule(
            false,
            [transactionNumber(d3, 11)],
            "송금인 1명(기준 3명 이상), 즉시 출금 0원 / 입금 300000원(기준 80% 이상)",
          ),
          relationshipRule(
            true,
            [
              transactionNumber(addDays(d3, -120), 1),
              transactionNumber(addDays(d3, -60), 2),
              transactionNumber(addDays(d3, -31), 4),
            ],
            "관계 거래 3회(기준 3회 이상), 기간 89일(기준 30일 이상), 다툼보다 120일 앞섬(기준 30일 이상), 다툼 300000원 / 최대 400000원 × 5",
          ),
        ],
        decision: {
          result: "PARTIAL",
          reason:
            "다툼 입금 이전 급여 입금이 정기적으로 확인되어 피해금만 보류한다.",
          earlyReleaseBasis: `관계 거래 ${transactionNumber(addDays(d3, -120), 1)}`,
          requestedHoldAmount: 300_000,
          appliedHoldAmount: 300_000,
          decidedBy: 2,
          decidedAt: at(addDays(getToday(), -5), "15:30:00"),
        },
      },
    ],
  }
}

const readState = (): MockState => readStore<MockState>(STORE_KEY, seed())
const writeState = (state: MockState) => writeStore(STORE_KEY, state)

/** 서버 `GateResult.allowsRelease` 와 같은 판정 허용 조건. */
const allowedResults = (objection: MockObjection) => {
  const normal = objection.branch === "NORMAL_ACCEPT"
  const open = !objection.litigationPending
  return {
    ACCEPTED:
      open && normal && (objection.clause === 1 || objection.clause === 2),
    PARTIAL:
      open &&
      (normal || objection.branch === "NORMAL_PARTIAL") &&
      objection.clause === 3,
    REJECTED: true,
  }
}

const disputedTotal = (objection: Pick<MockObjection, "disputedTransfers">) =>
  objection.disputedTransfers.reduce((sum, t) => sum + (t.amount ?? 0), 0)

const toSummary = (objection: MockObjection): ObjectionSummaryResponse => ({
  objectionId: objection.objectionId,
  caseId: objection.caseId,
  accountId: objection.accountId,
  clause: objection.clause,
  objectionStatus: objection.objectionStatus,
  caseStatus: objection.caseStatus,
  disputedTotal: disputedTotal(objection),
  objectionDeadline: objection.objectionDeadline,
  receivedAt: objection.receivedAt,
})

const toDetail = (objection: MockObjection): ObjectionDetailResponse => ({
  ...toSummary(objection),
  senderAccountId: objection.senderAccountId ?? undefined,
  disputedTransfers: objection.disputedTransfers,
  statement: objection.statement,
  simplifiedRequested: objection.simplifiedRequested,
  idCopyConfirmed: objection.idCopyConfirmed,
  litigationPending: objection.litigationPending,
  gate: {
    branch: objection.branch,
    simplifiedExcluded: false,
    rulesVersion: RULES_VERSION,
    allowedResults: allowedResults(objection),
    rules: objection.rules,
  },
  decision: objection.decision ?? undefined,
})

const requireIdempotencyKey = (request: Request) =>
  request.headers.get("Idempotency-Key")
    ? null
    : fail("CMN0002", "필수 입력값이 누락되었습니다.", 400)

const objectionNotFound = () =>
  fail("PST0202", "이의제기를 찾을 수 없습니다.", 404)

const CASE_STATUS_AFTER: Record<string, string> = {
  ACCEPTED: "RELEASED",
  PARTIAL: "PARTIAL",
  REJECTED: "STOPPED",
}

export const paymentStopApiHandlers = [
  http.get("*/admin/objections", async () => {
    await delay(MOCK_LATENCY_MS)
    const denied = requireMockPermission("PAYMENT_STOP_READ")
    if (denied) return denied

    const { objections } = readState()
    const recent = [...objections].sort((a, b) =>
      b.receivedAt.localeCompare(a.receivedAt),
    )
    return ok(recent.map(toSummary))
  }),

  http.get("*/admin/objections/:objectionId", async ({ params, request }) => {
    await delay(MOCK_LATENCY_MS)
    const denied = requireMockPermission("PAYMENT_STOP_READ")
    if (denied) return denied
    if (
      !ACCESS_REASONS.includes(request.headers.get("X-Access-Reason") ?? "")
    ) {
      return fail("CMN0007", "조회 사유가 없거나 올바르지 않습니다.", 400)
    }

    const objection = readState().objections.find(
      (item) => item.objectionId === Number(params.objectionId),
    )
    return objection ? ok(toDetail(objection)) : objectionNotFound()
  }),

  http.post(
    "*/admin/objections/:objectionId/decisions",
    async ({ params, request }) => {
      await delay(MOCK_LATENCY_MS)
      const denied =
        requireMockPermission("PAYMENT_STOP_WRITE") ??
        requireIdempotencyKey(request)
      if (denied) return denied

      const body = (await request.json()) as DecisionRequest
      const state = readState()
      const objection = state.objections.find(
        (item) => item.objectionId === Number(params.objectionId),
      )
      if (!objection) return objectionNotFound()
      if (objection.decision) {
        return fail("PST0302", "이미 판정이 확정된 이의제기입니다.", 409)
      }
      const releasing = body.result !== "REJECTED"
      if (releasing && !body.earlyReleaseBasis?.trim()) {
        return fail(
          "PST0004",
          "수용과 일부 지급정지 판정에는 조기 해제 근거가 필요합니다.",
          400,
        )
      }
      if (!allowedResults(objection)[body.result]) {
        return fail(
          "PST0301",
          "해제 요건을 충족하지 않아 이 판정을 확정할 수 없습니다.",
          409,
        )
      }

      const total = disputedTotal(objection)
      const decision: DecisionResponse = {
        result: body.result,
        reason: body.reason,
        earlyReleaseBasis: releasing ? body.earlyReleaseBasis : undefined,
        requestedHoldAmount: body.result === "PARTIAL" ? total : undefined,
        appliedHoldAmount: body.result === "PARTIAL" ? total : undefined,
        decidedBy: 1,
        decidedAt: toLocalDateTime(new Date()),
      }
      objection.decision = decision
      objection.objectionStatus = "DECIDED"
      objection.caseStatus = CASE_STATUS_AFTER[body.result]
      writeState(state)
      return ok(decision)
    },
  ),

  http.post("*/admin/objections", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)
    const denied =
      requireMockPermission("PAYMENT_STOP_WRITE") ??
      requireIdempotencyKey(request)
    if (denied) return denied

    const body = (await request.json()) as ReceiveRequest
    const state = readState()
    if (state.objections.some((item) => item.caseId === body.caseId)) {
      return fail("PST0304", "이미 이의제기가 접수된 사건입니다.", 409)
    }
    const pending = state.pendingCases.find(
      (item) => item.caseId === body.caseId,
    )
    if (!pending)
      return fail("PST0201", "지급정지 사건을 찾을 수 없습니다.", 404)
    if (pending.objectionDeadline < getToday()) {
      return fail("PST0002", "이의제기 신청 기한이 지났습니다.", 400)
    }
    if (!body.idCopyConfirmed || !body.statement.trim()) {
      return fail(
        "PST0003",
        "신분증 사본 확인과 이의제기 사유가 필요합니다.",
        400,
      )
    }

    const objectionId =
      Math.max(0, ...state.objections.map((item) => item.objectionId)) + 1
    const used = pending.disputedTransfers.map((t) => t.transactionNumber ?? "")
    state.objections.push({
      ...pending,
      objectionId,
      senderAccountId: null,
      caseStatus: "STOPPED",
      clause: body.clause,
      statement: body.statement,
      simplifiedRequested: body.simplifiedRequested ?? false,
      idCopyConfirmed: true,
      litigationPending: body.litigationPending ?? false,
      objectionStatus: "RECEIVED",
      receivedAt: toLocalDateTime(new Date()),
      branch: "UNDETERMINED",
      rules: [
        simplifiedRule(body.simplifiedRequested ?? false),
        fraudRule(false, used, "송금인 1명(기준 3명 이상)"),
        relationshipRule(
          false,
          [],
          "타행 송금이라 당행 관계 거래를 볼 수 없음",
        ),
      ],
      decision: null,
    })
    state.pendingCases = state.pendingCases.filter(
      (item) => item.caseId !== body.caseId,
    )
    writeState(state)
    return ok({ objectionId })
  }),

  http.post("*/admin/payment-stops", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)
    const denied =
      requireMockPermission("PAYMENT_STOP_WRITE") ??
      requireIdempotencyKey(request)
    if (denied) return denied

    const body = (await request.json()) as RegisterRequest
    const state = readState()
    const registered = new Set(
      [...state.objections, ...state.pendingCases].flatMap((item) =>
        item.disputedTransfers.map((t) => t.transactionNumber),
      ),
    )
    if (body.disputedTransactionNumbers.some((n) => registered.has(n))) {
      return fail(
        "PST0303",
        "다른 지급정지 사건에 이미 등록된 다툼 거래입니다.",
        409,
      )
    }

    const caseId =
      Math.max(
        0,
        ...[...state.objections, ...state.pendingCases].map(
          (item) => item.caseId,
        ),
      ) + 1
    state.pendingCases.push({
      caseId,
      accountId: body.accountId,
      objectionDeadline: body.objectionDeadline,
      disputedTransfers: body.disputedTransactionNumbers.map((number) => ({
        transactionNumber: number,
        amount: 500_000,
        occurredAt: at(addDays(getToday(), -3), "13:00:00"),
      })),
    })
    writeState(state)
    return ok({ caseId })
  }),
]
