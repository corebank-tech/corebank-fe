import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest"
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router"
import { http, HttpResponse } from "msw"
import { server } from "@/mocks/server"
import type { AdminPermission } from "@/entities/auth"
import {
  SessionContext,
  type SessionContextValue,
} from "@/features/session/model/session-context-value"
import type { ObjectionDetailResponse } from "@/shared/api/generated"
import { Adm05ObjectionDetail } from "@/pages/admin/adm05-objection-detail"

/**
 * 상세 응답을 바꿔 끼워 해제 요건 점검과 판정 확정의 분기를 본다. 메뉴 진입과 목록에서
 * 상세로 가는 흐름은 e2e(`e2e/admin-objections.spec.ts`)가 본다.
 */

const NORMAL_ACCEPT_DETAIL: ObjectionDetailResponse = {
  objectionId: 3,
  caseId: 13,
  accountId: 2003,
  senderAccountId: 3101,
  caseStatus: "STOPPED",
  objectionDeadline: "2026-12-15",
  disputedTransfers: [
    {
      transactionNumber: "TR202610240000000031",
      amount: 1_200_000,
      occurredAt: "2026-10-24T14:05:12",
    },
  ],
  clause: 2,
  statement: "거래처에 납품한 물품 대금입니다.",
  simplifiedRequested: false,
  idCopyConfirmed: true,
  litigationPending: false,
  // 수용과 일부 지급정지는 소명 완비 확인 뒤(심사 중)에만 쓸 수 있다(서버 `requireDecidable`).
  objectionStatus: "UNDER_REVIEW",
  reviewDeadline: "2026-11-10",
  receivedAt: "2026-11-03T10:21:40",
  gate: {
    branch: "NORMAL_ACCEPT",
    simplifiedExcluded: false,
    rulesVersion: "2026-11-03.1",
    allowedResults: { ACCEPTED: true, PARTIAL: false, REJECTED: true },
    rules: [
      {
        rule: "FRAUD_PATTERN",
        description: "다툼 거래 전후 다수 송금인 입금과 즉시 출금",
        basis: "LAW_INTERNAL_METRIC",
        matched: false,
        transactionNumbers: ["TR202610240000000031"],
        detail: "송금인 1명(기준 3명 이상)",
      },
      {
        rule: "RELATIONSHIP",
        description: "송금인과 명의인의 다툼 이전 지속 거래",
        basis: "INTERNAL",
        matched: true,
        transactionNumbers: ["TR202605270000000003"],
        detail: "관계 거래 3회(기준 3회 이상)",
      },
    ],
  },
}

const FRAUD_DETAIL: ObjectionDetailResponse = {
  ...NORMAL_ACCEPT_DETAIL,
  objectionId: 2,
  clause: 1,
  gate: {
    ...NORMAL_ACCEPT_DETAIL.gate,
    branch: "FRAUD_PATTERN",
    allowedResults: { ACCEPTED: false, PARTIAL: false, REJECTED: true },
  },
}

type DecisionCall = { body: unknown; idempotencyKey: string | null }
let decisionCalls: DecisionCall[] = []
let detailReasons: (string | null)[] = []

const respondDetail = (detail: ObjectionDetailResponse) =>
  server.use(
    http.get("*/admin/objections/:objectionId", ({ request }) => {
      detailReasons.push(request.headers.get("X-Access-Reason"))
      return HttpResponse.json({ code: "0000", message: "성공", data: detail })
    }),
  )

const respondDecision = (
  reply: (call: number) => { code: string; message: string; status: number },
) =>
  server.use(
    http.post(
      "*/admin/objections/:objectionId/decisions",
      async ({ request }) => {
        decisionCalls.push({
          body: await request.json(),
          idempotencyKey: request.headers.get("Idempotency-Key"),
        })
        const { code, message, status } = reply(decisionCalls.length)
        const body = decisionCalls.at(-1)?.body as { result?: string }
        const releasing = body?.result !== "REJECTED"
        return HttpResponse.json(
          code === "0000"
            ? {
                code,
                message,
                data: {
                  decisionId: 31,
                  result: body?.result,
                  status: releasing ? "PENDING_APPROVAL" : "CONFIRMED",
                },
              }
            : { code, message },
          { status },
        )
      },
    ),
  )

const sessionWith = (permissions: AdminPermission[]): SessionContextValue => ({
  isAuthenticated: true,
  isBootstrapping: false,
  customerName: "관리자",
  role: "ADMIN",
  permissions,
  remainingSeconds: 1800,
  expiredReason: null,
  isLoggingOut: false,
  setSession: async () => true,
  logout: async () => {},
  extend: () => {},
  acknowledgeExpired: () => {},
})

const renderDetail = ({
  path = "/admin/objections/3?reason=OPERATION",
  permissions = [
    "PAYMENT_STOP_READ",
    "PAYMENT_STOP_WRITE",
  ] as AdminPermission[],
} = {}) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <SessionContext.Provider value={sessionWith(permissions)}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route
              path="/admin/objections/:objectionId"
              element={<Adm05ObjectionDetail />}
            />
          </Routes>
        </MemoryRouter>
      </SessionContext.Provider>
    </QueryClientProvider>,
  )
}

const decisionRadio = (name: string) =>
  within(screen.getByRole("radiogroup")).getByRole("radio", { name })

/** 판정을 고르고 사유를 적은 뒤 [판정 확정] → 확인 다이얼로그 [확인]까지 누른다. */
const submitDecision = async (options: {
  result: string
  reason: string
  basis?: string
}) => {
  fireEvent.click(decisionRadio(options.result))
  fireEvent.change(screen.getByLabelText(/판정 사유/), {
    target: { value: options.reason },
  })
  if (options.basis != null) {
    fireEvent.change(screen.getByLabelText(/조기 해제 근거/), {
      target: { value: options.basis },
    })
  }
  fireEvent.click(
    screen.getByRole("button", { name: /^(판정 확정|승인 요청)$/ }),
  )
  const dialog = await screen.findByRole("dialog")
  fireEvent.click(within(dialog).getByRole("button", { name: "확인" }))
}

/**
 * AI 분석 영역이 부르는 API. 기본은 "실행 없음"이고, 분석 실패 경우만 바꿔 끼운다.
 * 타임라인 자체의 분기는 `widgets/objection/agent-analysis.test.tsx` 가 본다.
 */
const respondAgent = (runs: unknown[] = []) =>
  server.use(
    http.get("*/admin/objections/:objectionId/agent-runs", () =>
      HttpResponse.json({ code: "0000", message: "성공", data: runs }),
    ),
    http.get("*/admin/objections/:objectionId/agent-runs/:runId/steps", () =>
      HttpResponse.json({ code: "0000", message: "성공", data: [] }),
    ),
    http.get("*/admin/objections/:objectionId/review-draft", () =>
      HttpResponse.json({ code: "0000", message: "성공", data: null }),
    ),
  )

let sessionCalls: (string | null)[] = []
let approveCalls: (string | null)[] = []
let returnCalls: unknown[] = []
let noticeCalls = 0

const okJson = (data: unknown) =>
  HttpResponse.json({ code: "0000", message: "성공", data })

/**
 * 심사 운영 영역이 부르는 API(계약 v2). 기본은 빈 목록이고, 로그인한 관리자는 고객 번호
 * `adminId` 다. 심사 시작 기록과 승인 요청은 멱등키를 세어 둔다.
 */
const respondReviewOps = (adminId = 2) =>
  server.use(
    http.get("*/customers/me", () =>
      okJson({ customerId: adminId, userName: "관*자" }),
    ),
    http.post(
      "*/admin/objections/:objectionId/review-sessions",
      ({ request }) => {
        sessionCalls.push(request.headers.get("Idempotency-Key"))
        return okJson({ sessionId: 1, startedAt: "2026-11-06T09:00:00" })
      },
    ),
    http.get("*/admin/objections/:objectionId/documents", () => okJson([])),
    http.get("*/admin/objections/:objectionId/notices", () => {
      noticeCalls += 1
      return okJson([])
    }),
    http.get("*/admin/objections/:objectionId/external-checks", () =>
      okJson([]),
    ),
    http.get("*/admin/objections/:objectionId/ledger", () => okJson([])),
    http.post(
      "*/admin/objections/:objectionId/decisions/:decisionId/approve",
      ({ request }) => {
        approveCalls.push(request.headers.get("Idempotency-Key"))
        return okJson({
          decisionId: 51,
          status: "CONFIRMED",
          result: "ACCEPTED",
          approvedBy: 14,
        })
      },
    ),
    http.post(
      "*/admin/objections/:objectionId/decisions/:decisionId/return",
      async ({ request }) => {
        returnCalls.push(await request.json())
        return okJson({
          decisionId: 51,
          status: "RETURNED",
          result: "ACCEPTED",
          returnReason: "근거 거래 재확인 필요",
        })
      },
    ),
  )

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
beforeEach(() => {
  respondAgent()
  respondReviewOps()
})
afterEach(() => {
  server.resetHandlers()
  decisionCalls = []
  detailReasons = []
  sessionCalls = []
  approveCalls = []
  returnCalls = []
  noticeCalls = 0
})
afterAll(() => server.close())

describe("Adm05ObjectionDetail", () => {
  it("조회 사유를 고르기 전에는 상세를 요청하지 않는다", async () => {
    respondDetail(NORMAL_ACCEPT_DETAIL)
    renderDetail({ path: "/admin/objections/3" })

    expect(
      screen.getByText(/명의인 소명 원문을 열기 전에 조회 사유를 고르세요/),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/조회 사유/), {
      target: { value: "AUDIT" },
    })
    fireEvent.click(screen.getByRole("button", { name: "확인" }))

    expect(await screen.findByText("해제 요건 점검")).toBeInTheDocument()
    expect(detailReasons).toEqual(["AUDIT"])
  })

  it("해제 요건 점검 규칙을 근거 구분과 함께 그리고 내부 기준임을 밝힌다", async () => {
    respondDetail(NORMAL_ACCEPT_DETAIL)
    renderDetail()

    const fraudRow = (await screen.findByText("사기 패턴")).closest("tr")!
    expect(
      within(fraudRow).getByText("법 기준 내부 수치화"),
    ).toBeInTheDocument()
    expect(within(fraudRow).getByText("해당 없음")).toBeInTheDocument()

    const relationRow = screen.getByText("관계 인정").closest("tr")!
    expect(within(relationRow).getByText("내부 기준")).toBeInTheDocument()
    expect(within(relationRow).getByText("해당")).toBeInTheDocument()

    expect(screen.getByText("거래 기록상 정상 거래")).toBeInTheDocument()
    expect(
      screen.getByText(/점검 수치는 법령이나 당국이 정한 값이 아니라/),
    ).toBeInTheDocument()
    // "게이트" 같은 시스템 용어를 화면에 드러내지 않는다.
    expect(screen.queryByText(/게이트/)).not.toBeInTheDocument()
  })

  it("서버가 닫은 판정은 라디오를 잠그고 이유를 보인다", async () => {
    respondDetail(FRAUD_DETAIL)
    renderDetail({ path: "/admin/objections/2?reason=OPERATION" })

    await screen.findByText("해제 요건 점검")

    expect(decisionRadio("수용")).toBeDisabled()
    expect(decisionRadio("일부 지급정지")).toBeDisabled()
    expect(decisionRadio("불수용")).toBeEnabled()
    expect(decisionRadio("수용")).toHaveAccessibleDescription(
      "사기 패턴이 성립하고 정상 근거가 없어 해제할 수 없습니다.",
    )
  })

  it("소명 완비 확인 전에는 요건이 열려도 수용을 잠그고 불수용만 연다", async () => {
    respondDetail({ ...NORMAL_ACCEPT_DETAIL, objectionStatus: "RECEIVED" })
    renderDetail()
    await screen.findByText("해제 요건 점검")

    expect(decisionRadio("수용")).toBeDisabled()
    expect(decisionRadio("수용")).toHaveAccessibleDescription(
      "소명 완비 확인 뒤 고를 수 있습니다.",
    )
    expect(decisionRadio("불수용")).toBeEnabled()
    const choices = screen.getByRole("list", { name: "판정별 해제 요건" })
    expect(
      within(choices).getByText("소명 완비 확인 뒤 고를 수 있습니다."),
    ).toBeInTheDocument()
  })

  it("판정 작성이 상태 오류로 거부돼도 상세와 통지 기록을 다시 받는다", async () => {
    respondDetail(NORMAL_ACCEPT_DETAIL)
    respondDecision(() => ({
      code: "PST0308",
      message: "지금 상태에서 할 수 없는 요청입니다.",
      status: 409,
    }))
    renderDetail()
    await screen.findByText("해제 요건 점검")
    await waitFor(() => expect(noticeCalls).toBe(1))
    const detailCalls = detailReasons.length

    await submitDecision({ result: "불수용", reason: "사기 정황" })

    expect(
      await screen.findByText("지금 상태에서 할 수 없는 요청입니다."),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(detailReasons.length).toBeGreaterThan(detailCalls),
    )
    await waitFor(() => expect(noticeCalls).toBe(2))
  })

  it("통지 기록을 받지 못하면 기록 없음이 아니라 실패를 알린다", async () => {
    respondDetail(NORMAL_ACCEPT_DETAIL)
    server.use(
      http.get("*/admin/objections/:objectionId/notices", () =>
        HttpResponse.json(
          { code: "CMN9999", message: "일시적인 오류입니다." },
          { status: 500 },
        ),
      ),
    )
    renderDetail()

    expect(
      await screen.findByText(/통지 기록을 불러오지 못했습니다. 기록이 없다는/),
    ).toBeInTheDocument()
    expect(
      screen.queryByText("남긴 통지 기록이 없습니다."),
    ).not.toBeInTheDocument()
  })

  it("수용은 조기 해제 근거 없이 확정을 요청하지 않는다", async () => {
    respondDetail(NORMAL_ACCEPT_DETAIL)
    respondDecision(() => ({ code: "0000", message: "성공", status: 200 }))
    renderDetail()
    await screen.findByText("해제 요건 점검")

    fireEvent.click(decisionRadio("수용"))
    fireEvent.change(screen.getByLabelText(/판정 사유/), {
      target: { value: "정상 거래 관계가 확인됨" },
    })
    fireEvent.click(screen.getByRole("button", { name: "승인 요청" }))

    expect(
      await screen.findByText(
        "수용과 일부 지급정지는 조기 해제 근거를 입력해야 확정할 수 있습니다.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(decisionCalls).toHaveLength(0)
  })

  it("서버가 거부하면 서버 문구를 그대로 보인다", async () => {
    respondDetail(NORMAL_ACCEPT_DETAIL)
    respondDecision(() => ({
      code: "PST0301",
      message: "해제 요건을 충족하지 않아 이 판정을 확정할 수 없습니다.",
      status: 409,
    }))
    renderDetail()
    await screen.findByText("해제 요건 점검")

    await submitDecision({
      result: "수용",
      reason: "정상 거래 관계가 확인됨",
      basis: "관계 거래 TR202605270000000003",
    })

    expect(
      await screen.findByText(
        "해제 요건을 충족하지 않아 이 판정을 확정할 수 없습니다.",
      ),
    ).toBeInTheDocument()
    expect(decisionCalls[0].body).toEqual({
      result: "ACCEPTED",
      reason: "정상 거래 관계가 확인됨",
      earlyReleaseBasis: "관계 거래 TR202605270000000003",
    })
  })

  it("멱등키를 보내고, 같은 내용을 다시 보내면 같은 키를 쓴다", async () => {
    respondDetail(NORMAL_ACCEPT_DETAIL)
    respondDecision((call) =>
      call === 1
        ? {
            code: "CMN0301",
            message: "같은 요청을 처리 중입니다.",
            status: 409,
          }
        : { code: "0000", message: "성공", status: 200 },
    )
    renderDetail()
    await screen.findByText("해제 요건 점검")

    await submitDecision({ result: "불수용", reason: "사기 정황" })
    await screen.findByText("같은 요청을 처리 중입니다.")

    fireEvent.click(screen.getByRole("button", { name: "판정 확정" }))
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "확인" }))

    await waitFor(() => expect(decisionCalls).toHaveLength(2))
    const [first, retry] = decisionCalls
    expect(first.idempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(retry.idempotencyKey).toBe(first.idempotencyKey)
    // 불수용은 지급정지를 줄이지 않으므로 조기 해제 근거를 보내지 않는다.
    expect(first.body).toEqual({ result: "REJECTED", reason: "사기 정황" })
  })

  it("AI 분석이 실패해도 판정을 확정할 수 있다", async () => {
    respondDetail(NORMAL_ACCEPT_DETAIL)
    respondAgent([
      {
        runId: 31,
        status: "FAILED",
        attempt: 3,
        failureReason: "점유 시간 초과",
      },
    ])
    respondDecision(() => ({ code: "0000", message: "성공", status: 200 }))
    renderDetail()

    expect(await screen.findByText("AI 분석 중단")).toBeInTheDocument()
    await submitDecision({ result: "불수용", reason: "사기 정황" })

    await waitFor(() => expect(decisionCalls).toHaveLength(1))
    expect(
      await screen.findByText(/불수용 판정을 확정했습니다/),
    ).toBeInTheDocument()
  })

  it("조회 권한만 있으면 판정 입력을 그리지 않는다", async () => {
    respondDetail(NORMAL_ACCEPT_DETAIL)
    renderDetail({ permissions: ["PAYMENT_STOP_READ"] })

    expect(await screen.findByText("조회 전용 권한")).toBeInTheDocument()
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument()
  })

  it("확정된 판정이 있으면 입력 대신 확정 내용을 보인다", async () => {
    respondDetail({
      ...NORMAL_ACCEPT_DETAIL,
      objectionStatus: "DECIDED",
      decision: {
        result: "REJECTED",
        reason: "정상 근거 없음",
        decidedBy: 7,
        decidedAt: "2026-11-04T15:30:00",
      },
    })
    renderDetail()

    expect(await screen.findByText("확정된 판정")).toBeInTheDocument()
    expect(screen.getByText("관리자 번호 7")).toBeInTheDocument()
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument()
  })

  it("상세를 열면 심사 시작을 한 번 기록하고 멱등키를 보낸다", async () => {
    respondDetail(NORMAL_ACCEPT_DETAIL)
    renderDetail()

    await screen.findByText("해제 요건 점검")
    await waitFor(() => expect(sessionCalls).toHaveLength(1))
    expect(sessionCalls[0]).toMatch(/^[0-9a-f-]{36}$/)
  })

  it("수용을 작성하면 바로 확정하지 않고 승인 대기로 올린다", async () => {
    respondDetail(NORMAL_ACCEPT_DETAIL)
    respondDecision(() => ({ code: "0000", message: "성공", status: 200 }))
    renderDetail()
    await screen.findByText("해제 요건 점검")

    await submitDecision({
      result: "수용",
      reason: "정상 거래 관계가 확인됨",
      basis: "관계 거래 3회",
    })

    expect(
      await screen.findByText(/수용 판정을 승인 대기로 올렸습니다/),
    ).toBeInTheDocument()
  })

  it("심사 기한 경보가 켜지면 빨간 기한과 경고를 보인다", async () => {
    respondDetail({
      ...NORMAL_ACCEPT_DETAIL,
      objectionStatus: "UNDER_REVIEW",
      reviewDeadline: "2026-11-10",
      deadlineAlert: true,
    })
    renderDetail()

    expect(
      await screen.findByRole("status", {
        name: /심사 기한 2026\.11\.10.*기한 임박/,
      }),
    ).toBeInTheDocument()
    expect(screen.getByText("심사 기한 임박")).toBeInTheDocument()
  })

  it("기한이 지났으면 하루 전이라고 말하지 않고, 승인 대기면 보완 요청을 권하지 않는다", async () => {
    respondDetail({
      ...NORMAL_ACCEPT_DETAIL,
      objectionStatus: "PENDING_APPROVAL",
      reviewDeadline: "2026-01-05",
      deadlineAlert: true,
      pendingDecision: {
        decisionId: 51,
        status: "PENDING_APPROVAL",
        result: "ACCEPTED",
        reason: "수강료 정기 입금",
        decidedBy: 2,
        decidedAt: "2026-11-05T17:10:00",
      },
    })
    renderDetail()

    expect(await screen.findByText("심사 기한 경과")).toBeInTheDocument()
    expect(screen.getByText(/심사 기한이 지났습니다/)).toBeInTheDocument()
    expect(
      screen.getByText(/승인 대기 판정을 승인하거나 반려해야/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/보완을 요청하세요/)).not.toBeInTheDocument()
  })

  it("승인 대기 중에도 외부 확인을 요청할 수 있다", async () => {
    respondDetail({
      ...NORMAL_ACCEPT_DETAIL,
      objectionStatus: "PENDING_APPROVAL",
      pendingDecision: {
        decisionId: 51,
        status: "PENDING_APPROVAL",
        result: "ACCEPTED",
        reason: "수강료 정기 입금",
        decidedBy: 2,
        decidedAt: "2026-11-05T17:10:00",
      },
    })
    renderDetail()

    const panel = await screen.findByRole("region", { name: "외부 확인" })
    expect(within(panel).getByLabelText("요청 기관")).toBeInTheDocument()
  })

  it("보완 2회를 다 쓰면 보완 요청 입력 대신 소진 안내를 보인다", async () => {
    respondDetail({
      ...NORMAL_ACCEPT_DETAIL,
      objectionStatus: "UNDER_REVIEW",
      supplementRound: 2,
    })
    renderDetail()

    fireEvent.click(
      await screen.findByRole("button", { name: "보완 요청 작성" }),
    )
    expect(screen.getByText("보완 요청 횟수 소진")).toBeInTheDocument()
    expect(screen.queryByLabelText(/요청 사유/)).not.toBeInTheDocument()
  })

  it("보완 1회 뒤 재보완은 2회째이고 기한은 3영업일이라고 안내한다", async () => {
    respondDetail({
      ...NORMAL_ACCEPT_DETAIL,
      objectionStatus: "UNDER_REVIEW",
      supplementRound: 1,
    })
    renderDetail()

    fireEvent.click(
      await screen.findByRole("button", { name: "보완 요청 작성" }),
    )
    expect(
      screen.getByText(
        /이번 요청은 2회째 보완입니다. 보완 기한은 요청일부터 3영업일/,
      ),
    ).toBeInTheDocument()
  })

  describe("2인 승인", () => {
    const PENDING_DETAIL: ObjectionDetailResponse = {
      ...NORMAL_ACCEPT_DETAIL,
      objectionId: 5,
      objectionStatus: "PENDING_APPROVAL",
      pendingDecision: {
        decisionId: 51,
        status: "PENDING_APPROVAL",
        result: "ACCEPTED",
        reason: "수강료 정기 입금",
        earlyReleaseBasis: "관계 거래 3건",
        decidedBy: 2,
        decidedAt: "2026-11-05T17:10:00",
      },
    }
    const APPROVER: AdminPermission[] = [
      "PAYMENT_STOP_READ",
      "PAYMENT_STOP_APPROVE",
    ]

    it("승인 권한이 없으면 승인 대기와 작성자만 보이고 버튼이 없다", async () => {
      respondDetail(PENDING_DETAIL)
      renderDetail({ path: "/admin/objections/5?reason=OPERATION" })

      const panel = await screen.findByRole("region", {
        name: "승인 대기 판정",
      })
      expect(
        within(panel).getByText("관리자 번호 2 (본인)"),
      ).toBeInTheDocument()
      expect(within(panel).getByText("승인 권한 없음")).toBeInTheDocument()
      expect(
        within(panel).queryByRole("button", { name: "승인" }),
      ).not.toBeInTheDocument()
      // 승인 대기 중에는 판정을 다시 작성하지 않는다.
      expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument()
    })

    it("작성자 본인은 승인할 수 없지만 반려로 거둘 수 있다", async () => {
      respondDetail(PENDING_DETAIL)
      respondReviewOps(2)
      renderDetail({
        path: "/admin/objections/5?reason=OPERATION",
        permissions: APPROVER,
      })

      const panel = await screen.findByRole("region", {
        name: "승인 대기 판정",
      })
      await waitFor(() =>
        expect(
          within(panel).getByText(/본인이 작성한 판정은 승인할 수 없습니다/),
        ).toBeInTheDocument(),
      )
      expect(within(panel).getByRole("button", { name: "승인" })).toBeDisabled()

      fireEvent.click(within(panel).getByRole("button", { name: "반려" }))
      fireEvent.change(within(panel).getByLabelText(/반려 사유/), {
        target: { value: "근거 거래 재확인 필요" },
      })
      fireEvent.click(within(panel).getByRole("button", { name: "반려 확정" }))

      expect(await screen.findByText(/판정을 반려했습니다/)).toBeInTheDocument()
      expect(returnCalls).toEqual([{ reason: "근거 거래 재확인 필요" }])
    })

    it.each([
      ["PST0301", "해제 요건을 충족하지 않아 이 판정을 확정할 수 없습니다."],
      ["PST0309", "판정 작성자는 그 판정을 승인할 수 없습니다."],
    ])(
      "승인이 %s 로 거부되면 서버 문구를 승인 패널에 보인다",
      async (code, message) => {
        respondDetail(PENDING_DETAIL)
        respondReviewOps(14)
        server.use(
          http.post(
            "*/admin/objections/:objectionId/decisions/:decisionId/approve",
            () => HttpResponse.json({ code, message }, { status: 409 }),
          ),
        )
        renderDetail({
          path: "/admin/objections/5?reason=OPERATION",
          permissions: APPROVER,
        })

        const panel = await screen.findByRole("region", {
          name: "승인 대기 판정",
        })
        const approve = within(panel).getByRole("button", { name: "승인" })
        await waitFor(() => expect(approve).toBeEnabled())
        fireEvent.click(approve)
        const dialog = await screen.findByRole("dialog")
        fireEvent.click(within(dialog).getByRole("button", { name: "확인" }))

        expect(await within(panel).findByText(message)).toBeInTheDocument()
        expect(screen.queryByText("이미 처리된 판정")).not.toBeInTheDocument()
      },
    )

    it("다른 관리자가 먼저 승인했으면 이미 처리됐다고 알린다", async () => {
      respondDetail(PENDING_DETAIL)
      respondReviewOps(14)
      server.use(
        http.post(
          "*/admin/objections/:objectionId/decisions/:decisionId/approve",
          () =>
            HttpResponse.json(
              {
                code: "PST0302",
                message: "이미 판정이 확정된 이의제기입니다.",
              },
              { status: 409 },
            ),
        ),
      )
      renderDetail({
        path: "/admin/objections/5?reason=OPERATION",
        permissions: APPROVER,
      })

      const panel = await screen.findByRole("region", {
        name: "승인 대기 판정",
      })
      const approve = within(panel).getByRole("button", { name: "승인" })
      await waitFor(() => expect(approve).toBeEnabled())
      fireEvent.click(approve)
      const dialog = await screen.findByRole("dialog")
      fireEvent.click(within(dialog).getByRole("button", { name: "확인" }))

      expect(await screen.findByText("이미 처리된 판정")).toBeInTheDocument()
      expect(
        screen.getByText(/다른 관리자가 먼저 승인하거나 반려했습니다/),
      ).toBeInTheDocument()
    })

    it("다른 승인 관리자는 확인 뒤 승인하고 멱등키를 보낸다", async () => {
      respondDetail(PENDING_DETAIL)
      respondReviewOps(14)
      renderDetail({
        path: "/admin/objections/5?reason=OPERATION",
        permissions: APPROVER,
      })

      const panel = await screen.findByRole("region", {
        name: "승인 대기 판정",
      })
      const approve = within(panel).getByRole("button", { name: "승인" })
      await waitFor(() => expect(approve).toBeEnabled())
      fireEvent.click(approve)
      const dialog = await screen.findByRole("dialog")
      fireEvent.click(within(dialog).getByRole("button", { name: "확인" }))

      expect(
        await screen.findByText(/수용 판정을 승인해 확정했습니다/),
      ).toBeInTheDocument()
      expect(approveCalls).toHaveLength(1)
      expect(approveCalls[0]).toMatch(/^[0-9a-f-]{36}$/)
    })
  })
})
