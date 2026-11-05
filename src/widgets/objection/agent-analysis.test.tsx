import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { http, HttpResponse } from "msw"
import { server } from "@/mocks/server"
import type { AgentRunStepResponse } from "@/shared/api/generated"
import { AgentAnalysis } from "@/widgets/objection/agent-analysis"

/**
 * AI 분석 실행 타임라인(계획 PA-07). 실제 시간으로 1초 폴링을 돌리므로 몇 초씩 걸린다.
 * 가짜 타이머를 쓰면 MSW 응답과 TanStack Query 의 타이머가 엇갈려 순서를 보장하기 어렵다.
 */

const POLLING_TEST_TIMEOUT_MS = 15_000

const envelope = (data: unknown) =>
  HttpResponse.json({ code: "0000", message: "성공", data })

const step = (
  seq: number,
  type: string,
  title: string,
  detail: Record<string, unknown> = {},
): AgentRunStepResponse => ({
  seq,
  type,
  title,
  summary: "",
  detail,
  status: "DONE",
  startedAt: `2026-11-05T10:00:0${seq}.000`,
  endedAt: `2026-11-05T10:00:0${seq}.500`,
})

const GATE_STEP = step(4, "GATE_EVALUATED", "해제 요건 점검", {
  branch: "FRAUD_PATTERN",
  agentBranch: "UNDETERMINED",
  allowedResults: { ACCEPTED: false, PARTIAL: false, REJECTED: true },
})

const SCRIPT: AgentRunStepResponse[] = [
  step(1, "CLAIMED", "분석 작업 시작"),
  step(2, "CONTEXT_LOADED", "소명과 다툼 거래 확인"),
  step(3, "TOOL_CALL", "다툼 거래 전후 원장 조회", {
    tool: "get_ledger",
    reason: "다툼 입금 직후 출금 확인",
    args: { from: "2026-10-30T00:00:00" },
    resultSummary: "1시간 안 타행 출금 3건",
    transactionNumbers: ["TR202610300000000021"],
  }),
  GATE_STEP,
]

const DRAFT = {
  runId: 7,
  branch: "UNDETERMINED",
  content: {
    evidenceTransactionNumbers: ["TR202610300000000021"],
    missingDocuments: ["다른 은행 거래내역서"],
    claims: [{ text: "모르는 사람이 보낸 돈이다", quote: "모르는 돈입니다." }],
    contradictions: [],
    followUps: ["수사기관 회신 요청"],
    noticeDraft: "거래내역서를 제출해 주시기 바랍니다.",
  },
  submittedAt: "2026-11-05T10:00:05",
}

let stepAfterValues: number[] = []
let reviewKeys: (string | null)[] = []

/**
 * 단계 요청이 올 때마다 각본을 한 묶음씩 더 내보낸다(1~2, 3, 4). 마지막 단계까지 내보낸
 * 뒤에야 실행 목록이 COMPLETED 를 준다 — 서버가 마지막 단계와 실행 종료를 한 트랜잭션에
 * 남기는 것과 같은 순서다.
 */
const respondStreaming = () => {
  const releaseAt = [2, 3, 4]
  let released = 0
  server.use(
    http.get("*/admin/objections/:objectionId/agent-runs", () =>
      envelope([
        {
          runId: 7,
          status: released >= SCRIPT.length ? "COMPLETED" : "RUNNING",
          attempt: 1,
        },
      ]),
    ),
    http.get(
      "*/admin/objections/:objectionId/agent-runs/:runId/steps",
      ({ request }) => {
        const after = Number(new URL(request.url).searchParams.get("after"))
        stepAfterValues.push(after)
        released = releaseAt[Math.min(stepAfterValues.length, 3) - 1]
        return envelope(
          SCRIPT.slice(0, released).filter((item) => (item.seq ?? 0) > after),
        )
      },
    ),
    http.get("*/admin/objections/:objectionId/review-draft", () =>
      envelope(released >= SCRIPT.length ? DRAFT : null),
    ),
  )
}

const respondCompleted = (status = "COMPLETED") =>
  server.use(
    http.get("*/admin/objections/:objectionId/agent-runs", () =>
      envelope([{ runId: 7, status, attempt: 1 }]),
    ),
    http.get("*/admin/objections/:objectionId/agent-runs/:runId/steps", () =>
      envelope(status === "COMPLETED" ? SCRIPT : SCRIPT.slice(0, 2)),
    ),
    http.get("*/admin/objections/:objectionId/review-draft", () =>
      envelope(status === "COMPLETED" ? DRAFT : null),
    ),
    http.post(
      "*/admin/objections/:objectionId/review-requests",
      ({ request }) => {
        reviewKeys.push(request.headers.get("Idempotency-Key"))
        return envelope({ runId: 8 })
      },
    ),
  )

const renderAnalysis = (
  props: { isDecided?: boolean; canRequest?: boolean } = {},
) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <AgentAnalysis
        objectionId={2}
        isDecided={props.isDecided ?? false}
        canRequest={props.canRequest ?? true}
      />
    </QueryClientProvider>,
  )
}

const EXPECTED_TITLES = SCRIPT.map((item) => item.title)

const renderedTitles = () =>
  [...document.querySelectorAll("li[data-seq]")].map(
    (item) => item.querySelector("span.font-bold")?.textContent,
  )

const sleep = (millis: number) =>
  new Promise((resolve) => setTimeout(resolve, millis))

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => {
  server.resetHandlers()
  stepAfterValues = []
  reviewKeys = []
})
afterAll(() => server.close())

describe("AgentAnalysis", () => {
  it(
    "단계가 도착하는 대로 순서대로 붙이고, 실행이 끝나면 폴링을 멈춘다",
    async () => {
      respondStreaming()
      renderAnalysis()

      await screen.findByText("소명과 다툼 거래 확인")
      // 부하가 크면 다음 묶음이 이미 붙었을 수 있다. 몇 개가 보이든 순서는 각본 앞부분과 같아야 한다.
      const firstTitles = renderedTitles()
      expect(firstTitles).toEqual(EXPECTED_TITLES.slice(0, firstTitles.length))
      expect(firstTitles.length).toBeGreaterThanOrEqual(2)

      await screen.findByText("다툼 거래 전후 원장 조회", undefined, {
        timeout: 3_000,
      })
      // 제목과 단계 종류가 둘 다 "해제 요건 점검"이라 순번으로 기다린다.
      await waitFor(
        () => expect(document.querySelector('li[data-seq="4"]')).not.toBeNull(),
        { timeout: 3_000 },
      )
      expect(renderedTitles()).toEqual([
        "분석 작업 시작",
        "소명과 다툼 거래 확인",
        "다툼 거래 전후 원장 조회",
        "해제 요건 점검",
      ])
      // 마지막으로 받은 순번 뒤만 묻는다.
      expect(stepAfterValues.slice(0, 3)).toEqual([0, 2, 3])

      await screen.findByText("완료", undefined, { timeout: 3_000 })
      await waitFor(() => expect(stepAfterValues.at(-1)).toBe(4), {
        timeout: 3_000,
      })
      const callsAfterEnd = stepAfterValues.length
      await sleep(2_500)
      expect(stepAfterValues).toHaveLength(callsAfterEnd)
      expect(screen.queryByText("다음 단계 진행 중")).not.toBeInTheDocument()
    },
    POLLING_TEST_TIMEOUT_MS,
  )

  it("도구 호출과 서버 규칙 단계를 구분해 그린다", async () => {
    respondCompleted()
    renderAnalysis()

    const toolStep = (
      await screen.findByText("다툼 거래 전후 원장 조회")
    ).closest("li")!
    expect(within(toolStep).getByText("도구 get_ledger")).toBeInTheDocument()
    expect(
      within(toolStep).getByText("다툼 입금 직후 출금 확인"),
    ).toBeInTheDocument()
    expect(
      within(toolStep).getByText("TR202610300000000021"),
    ).toBeInTheDocument()

    const gateStep = document.querySelector('li[data-seq="4"]')!
    expect(
      within(gateStep as HTMLElement).getByText("서버 규칙"),
    ).toBeInTheDocument()
    expect(screen.getAllByText("AI Agent")).toHaveLength(1)
  })

  it("판정안을 참고안으로 보이고, 서버 규칙과 갈래가 다르면 경고한다", async () => {
    respondCompleted()
    renderAnalysis()

    const panel = await screen.findByRole("region", { name: "AI 판정안" })
    expect(
      within(panel).getByText(
        "AI 판정안은 심사 참고안이며 지급정지 해제 근거로 쓰이지 않습니다.",
      ),
    ).toBeInTheDocument()
    expect(
      await within(panel).findByText("다른 은행 거래내역서"),
    ).toBeInTheDocument()
    expect(within(panel).getByText("수사기관 회신 요청")).toBeInTheDocument()
    expect(
      within(panel).getByText("거래내역서를 제출해 주시기 바랍니다."),
    ).toBeInTheDocument()
    expect(
      within(panel).getByText("서버 규칙 결과와 AI 판정안이 다름"),
    ).toBeInTheDocument()
  })

  it("재분석 요청에 멱등키를 실어 보낸다", async () => {
    respondCompleted()
    renderAnalysis()

    const button = await screen.findByRole("button", { name: "재분석 요청" })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)

    await waitFor(() => expect(reviewKeys).toHaveLength(1))
    expect(reviewKeys[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })

  it("분석 중이거나 판정이 확정됐으면 재분석을 막는다", async () => {
    respondCompleted("RUNNING")
    renderAnalysis()
    await screen.findByText("분석 중")
    expect(screen.getByRole("button", { name: "재분석 요청" })).toBeDisabled()
    // 앞 단계가 끝나고 다음 단계가 아직 오지 않은 동안에도 진행 중임을 보인다.
    expect(await screen.findByText("다음 단계 진행 중")).toBeInTheDocument()
  })

  it("판정이 확정된 이의제기는 재분석을 막는다", async () => {
    respondCompleted()
    renderAnalysis({ isDecided: true })
    await screen.findByText("완료")
    expect(screen.getByRole("button", { name: "재분석 요청" })).toBeDisabled()
  })
})
