import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
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
  objectionStatus: "RECEIVED",
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
        return HttpResponse.json(
          code === "0000"
            ? { code, message, data: { result: "ACCEPTED" } }
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
  fireEvent.click(screen.getByRole("button", { name: "판정 확정" }))
  const dialog = await screen.findByRole("dialog")
  fireEvent.click(within(dialog).getByRole("button", { name: "확인" }))
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => {
  server.resetHandlers()
  decisionCalls = []
  detailReasons = []
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
    expect(screen.getByTestId("agent-timeline-placeholder")).toBeInTheDocument()
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

  it("수용은 조기 해제 근거 없이 확정을 요청하지 않는다", async () => {
    respondDetail(NORMAL_ACCEPT_DETAIL)
    respondDecision(() => ({ code: "0000", message: "성공", status: 200 }))
    renderDetail()
    await screen.findByText("해제 요건 점검")

    fireEvent.click(decisionRadio("수용"))
    fireEvent.change(screen.getByLabelText(/판정 사유/), {
      target: { value: "정상 거래 관계가 확인됨" },
    })
    fireEvent.click(screen.getByRole("button", { name: "판정 확정" }))

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
})
