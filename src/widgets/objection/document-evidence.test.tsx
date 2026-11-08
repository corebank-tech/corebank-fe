import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
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
import { DocumentEvidence } from "@/widgets/objection/document-evidence"

/**
 * 첨부 서류와 판독 오버레이. 서류 주장 카드와 판독 영역이 서로 강조되는지, 서류 내용 요청에
 * 상세와 같은 조회 사유를 싣는지, 신분증 사본을 판독 안 함으로 보이는지를 본다.
 */

const okJson = (data: unknown) =>
  HttpResponse.json({ code: "0000", message: "성공", data })

let contentReasons: (string | null)[] = []

const PAGE = {
  page: 1,
  width: 800,
  height: 1000,
  regions: [
    {
      index: 0,
      text: "물품 공급 계약서",
      bbox: [250, 80, 300, 46],
      confidence: 0.98,
    },
    {
      index: 1,
      text: "공급자: 김*수",
      bbox: [64, 200, 280, 36],
      confidence: 0.97,
    },
    {
      index: 2,
      text: "월 공급 대금: 1,200,000원",
      bbox: [64, 262, 400, 36],
      confidence: 0.85,
    },
  ],
}

const respond = () =>
  server.use(
    http.get("*/admin/objections/:objectionId/documents", () =>
      okJson([
        {
          documentId: 301,
          kind: "EVIDENCE",
          fileName: "물품공급계약서.png",
          contentType: "image/png",
          size: 182_400,
          round: 0,
          ocrStatus: "DONE",
        },
        {
          documentId: 303,
          kind: "ID_COPY",
          fileName: "신분증_사본.jpg",
          contentType: "image/jpeg",
          size: 310_552,
          round: 0,
        },
      ]),
    ),
    http.get(
      "*/admin/objections/:objectionId/documents/:documentId/content",
      ({ request }) => {
        contentReasons.push(request.headers.get("X-Access-Reason"))
        // 서버는 PDF, PNG, JPEG 만 준다. 내용은 화면이 그림 주소로만 쓴다.
        return new HttpResponse(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
          headers: { "Content-Type": "image/png" },
        })
      },
    ),
    http.get("*/admin/objections/:objectionId/documents/:documentId/ocr", () =>
      okJson({ documentId: 301, pages: [PAGE] }),
    ),
    http.get("*/admin/objections/:objectionId/agent-runs", () =>
      okJson([{ runId: 31, status: "COMPLETED", attempt: 1 }]),
    ),
    http.get("*/admin/objections/:objectionId/review-draft", () =>
      okJson({
        runId: 31,
        branch: "NORMAL_ACCEPT",
        content: {
          claims: [
            {
              text: "거래처에 납품한 물품 대금이다",
              quote: "물품 대금을 받은 것입니다.",
              source: "STATEMENT",
              documentId: null,
              regionIndex: null,
            },
            {
              text: "서류에 적힌 금액은 1,200,000원이다",
              quote: "월 공급 대금: 1,200,000원",
              source: "DOCUMENT",
              documentId: 301,
              regionIndex: 2,
            },
          ],
        },
      }),
    ),
  )

const renderEvidence = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <DocumentEvidence objectionId={3} accessReason="AUDIT" />
    </QueryClientProvider>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
beforeEach(() => {
  respond()
  // jsdom 에는 blob 주소가 없다. 그림 주소만 있으면 되므로 고정값을 돌려준다.
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:mock-document"),
      revokeObjectURL: vi.fn(),
    }),
  )
})
afterEach(() => {
  server.resetHandlers()
  vi.unstubAllGlobals()
  contentReasons = []
})
afterAll(() => server.close())

describe("DocumentEvidence", () => {
  it("서류 주장 카드를 누르면 그 판독 영역이, 영역을 누르면 그 주장이 강조된다", async () => {
    renderEvidence()

    // 서류는 누르기 전에는 열지 않는다. 주장 카드를 누르면 그 서류를 연다.
    const documentClaim = await screen.findByRole("button", {
      name: /서류에 적힌 금액은 1,200,000원이다/,
    })
    expect(contentReasons).toEqual([])
    fireEvent.click(documentClaim)
    const region = await screen.findByRole("button", {
      name: "판독 영역 2: 월 공급 대금: 1,200,000원",
    })
    expect(region).toHaveAttribute("aria-pressed", "true")
    expect(documentClaim).toHaveAttribute("aria-pressed", "true")

    // 다른 영역을 누르면 서류 주장의 강조가 풀리고, 다시 그 영역을 누르면 주장이 강조된다.
    fireEvent.click(
      screen.getByRole("button", { name: "판독 영역 1: 공급자: 김*수" }),
    )
    expect(documentClaim).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(region)
    expect(documentClaim).toHaveAttribute("aria-pressed", "true")

    // 소명에서 나온 주장은 영역과 이어지지 않아 누르는 카드가 아니다.
    expect(
      screen.queryByRole("button", { name: /거래처에 납품한 물품 대금이다/ }),
    ).not.toBeInTheDocument()
    expect(contentReasons).toEqual(["AUDIT"])
  })

  it("상세를 열기만 해서는 어떤 서류도 받지 않는다. 증빙이 없어도 신분증 사본을 열지 않는다", async () => {
    server.use(
      http.get("*/admin/objections/:objectionId/documents", () =>
        okJson([
          {
            documentId: 303,
            kind: "ID_COPY",
            fileName: "신분증_사본.jpg",
            contentType: "image/jpeg",
            size: 310_552,
            round: 0,
          },
        ]),
      ),
    )
    renderEvidence()

    await screen.findByText("신분증_사본.jpg")
    expect(
      screen.getByText(/볼 서류의 \[보기\]를 누르세요/),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("img", { name: "신분증_사본.jpg" }),
    ).not.toBeInTheDocument()
    // 서류 목록을 다시 받을 시간을 두어도 내용 요청(열람 감사)은 없다.
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(contentReasons).toEqual([])
  })

  it("판독이 끝나면 새로고침 없이 판독 영역이 나타난다", async () => {
    let runCalls = 0
    server.use(
      http.get("*/admin/objections/:objectionId/agent-runs", () => {
        runCalls += 1
        return okJson([
          {
            runId: 31,
            status: runCalls === 1 ? "RUNNING" : "COMPLETED",
            attempt: 1,
          },
        ])
      }),
      http.get("*/admin/objections/:objectionId/agent-runs/:runId/steps", () =>
        okJson([]),
      ),
      http.get("*/admin/objections/:objectionId/documents", () =>
        okJson([
          {
            documentId: 301,
            kind: "EVIDENCE",
            fileName: "물품공급계약서.png",
            contentType: "image/png",
            size: 182_400,
            round: 0,
            // 워커가 실행 안에서 판독하므로 실행이 끝난 뒤의 목록에서 완료가 된다.
            ocrStatus: runCalls <= 1 ? "PENDING" : "DONE",
          },
        ]),
      ),
    )
    renderEvidence()

    fireEvent.click(
      await screen.findByRole("button", { name: "물품공급계약서.png 보기" }),
    )
    expect(await screen.findByText("판독 대기")).toBeInTheDocument()
    expect(
      await screen.findByRole(
        "button",
        { name: "판독 영역 2: 월 공급 대금: 1,200,000원" },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument()
  })

  it("판정안이 최근 실행 것이 아니면 주장 카드에 이전 실행 결과라고 붙인다", async () => {
    server.use(
      http.get("*/admin/objections/:objectionId/agent-runs", () =>
        okJson([{ runId: 32, status: "FAILED", attempt: 3 }]),
      ),
    )
    renderEvidence()

    expect(await screen.findByText("이전 실행 31번 결과")).toBeInTheDocument()
  })

  it("신분증 사본은 판독 안 함으로 보이고, 열어도 판독 영역이 없다", async () => {
    renderEvidence()

    const idRow = (await screen.findByText("신분증_사본.jpg")).closest("tr")!
    expect(within(idRow).getByText("신분증 사본")).toBeInTheDocument()
    expect(within(idRow).getByText("판독 안 함")).toBeInTheDocument()

    fireEvent.click(
      within(idRow).getByRole("button", { name: "신분증_사본.jpg 보기" }),
    )
    expect(
      await screen.findByText(
        /신분증 사본은 판독하지 않고 AI 분석에도 보내지 않습니다/,
      ),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: "신분증_사본.jpg" }),
      ).toBeInTheDocument(),
    )
    expect(
      screen.queryByRole("group", { name: /판독 영역/ }),
    ).not.toBeInTheDocument()
  })
})
