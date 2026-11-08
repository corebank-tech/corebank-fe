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
import { H01MyPaymentStops } from "@/pages/objection/h01-my-payment-stops"
import { H03ObjectionSupplement } from "@/pages/objection/h03-objection-supplement"
import type { MyCaseResponse } from "@/shared/api/generated"

const PDF_HEAD = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]

const REQUESTED: MyCaseResponse = {
  caseId: 102,
  accountNumberMasked: "110-632-***336",
  disputedTotal: 350_000,
  objectionDeadline: "2099-12-31",
  objectionId: 201,
  objectionStatus: "SUPPLEMENT_REQUESTED",
  supplementDue: "2099-11-10",
  missingDocuments: ["거래상대방과 주고받은 대화 내역", "물품 거래 계약서"],
}

const UNDER_REVIEW: MyCaseResponse = {
  caseId: 103,
  accountNumberMasked: "352-0412-****-73",
  disputedTotal: 2_800_000,
  objectionDeadline: "2099-12-31",
  objectionId: 202,
  objectionStatus: "UNDER_REVIEW",
  missingDocuments: [],
}

const NOT_APPLIED: MyCaseResponse = {
  caseId: 101,
  accountNumberMasked: "110-632-***777",
  disputedTotal: 1_200_000,
  objectionDeadline: "2099-12-31",
  missingDocuments: [],
}

const ACCEPTED: MyCaseResponse = {
  caseId: 104,
  accountNumberMasked: "110-632-***512",
  caseStatus: "RELEASED",
  disputedTotal: 480_000,
  objectionDeadline: "2099-12-31",
  objectionId: 198,
  objectionStatus: "DECIDED",
  missingDocuments: [],
  decisionResult: "ACCEPTED",
}

const REJECTED: MyCaseResponse = {
  caseId: 105,
  accountNumberMasked: "352-0412-****-88",
  caseStatus: "STOPPED",
  disputedTotal: 900_000,
  objectionDeadline: "2099-12-31",
  objectionId: 199,
  objectionStatus: "DECIDED",
  missingDocuments: [],
  decisionResult: "REJECTED",
}

let supplementBodies: string[] = []
let supplementUrls: string[] = []
let caseListCalls = 0

const useCases = (cases: MyCaseResponse[]) =>
  server.use(
    http.get("*/payment-stops/my", () => {
      caseListCalls += 1
      return HttpResponse.json({ code: "0000", message: "성공", data: cases })
    }),
  )

const useSupplementFailure = (code: string, message: string, status: number) =>
  server.use(
    http.post("*/objections/:objectionId/supplements", () =>
      HttpResponse.json({ code, message }, { status }),
    ),
  )

const attachPdf = async (name = "c.pdf") => {
  fireEvent.change(screen.getByLabelText("보완 서류 파일 선택"), {
    target: { files: [new File([new Uint8Array(PDF_HEAD)], name)] },
  })
  await screen.findByRole("button", { name: `${name} 삭제` })
}

const useSupplementReply = () =>
  server.use(
    http.post(
      "*/objections/:objectionId/supplements",
      async ({ request, params }) => {
        supplementUrls.push(request.url)
        supplementBodies.push(
          `${String(params.objectionId)}|${await request.text()}`,
        )
        return HttpResponse.json({
          code: "0000",
          message: "성공",
          data: [{ documentId: 1, kind: "EVIDENCE", fileName: "c.pdf" }],
        })
      },
    ),
  )

const renderAt = (path: string) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/support/payment-stops"
            element={<H01MyPaymentStops />}
          />
          <Route
            path="/support/payment-stops/:caseId/supplement"
            element={<H03ObjectionSupplement />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => {
  server.resetHandlers()
  supplementBodies = []
  supplementUrls = []
  caseListCalls = 0
})
afterAll(() => server.close())

describe("H01MyPaymentStops", () => {
  it("상태마다 할 수 있는 일만 보인다", async () => {
    useCases([NOT_APPLIED, REQUESTED, UNDER_REVIEW])
    renderAt("/support/payment-stops")

    expect(await screen.findByText("[총 3건]")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "110-632-***777 이의제기 신청" }),
    ).toHaveAttribute("href", "/support/payment-stops/101/objection")
    expect(
      screen.getByRole("link", { name: "110-632-***336 보완 서류 제출" }),
    ).toHaveAttribute("href", "/support/payment-stops/102/supplement")
    // 보완 요청 서류와 기한을 함께 보인다
    expect(screen.getByText("거래상대방과 주고받은 대화 내역")).toBeVisible()
    expect(screen.getByText(/2099\.11\.10까지/)).toBeVisible()
    // 심사 중인 사건에는 신청도 보완도 없다
    expect(
      screen.queryByRole("link", { name: /352-0412-\*\*\*\*-73/ }),
    ).toBeNull()
    expect(screen.getByText("심사 중")).toBeInTheDocument()
  })

  it("확정된 사건은 심사결과와 지급정지 상태를 결과마다 다르게 보인다", async () => {
    useCases([ACCEPTED, REJECTED])
    renderAt("/support/payment-stops")

    const accepted = await screen.findByRole("region", {
      name: "지급정지 계좌 110-632-***512",
    })
    expect(within(accepted).getAllByText("이의제기 수용")).not.toHaveLength(0)
    expect(within(accepted).getByText("지급정지 해제")).toBeInTheDocument()

    const rejected = screen.getByRole("region", {
      name: "지급정지 계좌 352-0412-****-88",
    })
    expect(within(rejected).getAllByText("이의제기 불수용")).not.toHaveLength(0)
    expect(
      within(rejected).getByText(
        "이의제기가 받아들여지지 않았습니다. 지급정지가 이어집니다.",
      ),
    ).toBeInTheDocument()
    expect(within(rejected).getByText("지급정지 중")).toBeInTheDocument()
    // 불수용을 "심사 완료" 하나로 묶어 보이지 않는다
    expect(screen.queryByText("심사 완료")).toBeNull()
  })

  it("지급정지 사건이 없으면 빈 안내를 보인다", async () => {
    useCases([])
    renderAt("/support/payment-stops")

    expect(
      await screen.findByText("지급정지된 계좌가 없습니다."),
    ).toBeInTheDocument()
  })
})

describe("H03ObjectionSupplement", () => {
  it("보완 요청 상태가 아니면 입력과 제출을 막는다", async () => {
    useCases([UNDER_REVIEW])
    renderAt("/support/payment-stops/103/supplement")

    expect(
      await screen.findByText("지금은 보완 서류를 낼 수 없습니다"),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("보완 서류 파일 선택")).toBeDisabled()
    expect(screen.getByLabelText("전할 말")).toBeDisabled()
    expect(
      screen.getByRole("button", { name: "보완 서류 제출" }),
    ).toBeDisabled()
  })

  it("보완 요청 상태에서 파일 없이 내면 막고, 파일을 붙이면 제출한다", async () => {
    useCases([REQUESTED])
    useSupplementReply()
    renderAt("/support/payment-stops/102/supplement")

    const submit = await screen.findByRole("button", { name: "보완 서류 제출" })
    expect(screen.getByText("물품 거래 계약서")).toBeInTheDocument()
    fireEvent.click(submit)
    expect(
      await screen.findByText("보완 서류를 하나 이상 첨부하세요."),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("보완 서류 파일 선택")).toHaveFocus()
    expect(supplementBodies).toHaveLength(0)

    await attachPdf()
    fireEvent.change(screen.getByLabelText("전할 말"), {
      target: { value: "계약서를 올립니다." },
    })
    fireEvent.click(submit)

    expect(
      await screen.findByText("보완 서류를 제출했습니다"),
    ).toBeInTheDocument()
    expect(supplementBodies).toHaveLength(1)
    const [objectionId, body] = supplementBodies[0].split("|")
    expect(objectionId).toBe("201")
    expect(body.split('name="evidence"').length - 1).toBe(1)
    expect(body).toContain("계약서를 올립니다.")
    // 전할 말은 주소가 아니라 본문으로 간다
    expect(new URL(supplementUrls[0]).search).toBe("")
  })

  it("검사 중에 또 고른 파일도 버리지 않고 함께 붙인다", async () => {
    useCases([REQUESTED])
    renderAt("/support/payment-stops/102/supplement")
    const input = await screen.findByLabelText("보완 서류 파일 선택")

    fireEvent.change(input, {
      target: { files: [new File([new Uint8Array(PDF_HEAD)], "a.pdf")] },
    })
    fireEvent.change(input, {
      target: { files: [new File([new Uint8Array(PDF_HEAD)], "b.pdf")] },
    })

    await screen.findByRole("button", { name: "b.pdf 삭제" })
    expect(screen.getByRole("button", { name: "a.pdf 삭제" })).toBeVisible()
  })

  it("누적 한도 초과(PST0007)면 이미 낸 서류까지 센다고 안내한다", async () => {
    useCases([REQUESTED])
    useSupplementFailure(
      "PST0007",
      "파일 형식, 크기, 개수가 허용 범위를 벗어났습니다.",
      400,
    )
    renderAt("/support/payment-stops/102/supplement")
    await screen.findByRole("button", { name: "보완 서류 제출" })
    await attachPdf()
    fireEvent.click(screen.getByRole("button", { name: "보완 서류 제출" }))

    expect(
      await screen.findByText(
        /신청 때 낸 신분증 사본과 증빙까지 모두 합쳐 10개, 30MB까지입니다\. 파일 수를 줄이거나/,
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "다시 제출" })).toBeEnabled()
  })

  it("보완 요청 상태가 끝났으면(PST0308) 다시 제출 대신 목록으로 안내하고 목록을 다시 받는다", async () => {
    useCases([REQUESTED])
    useSupplementFailure("PST0308", "지금 상태에서 할 수 없는 요청입니다.", 409)
    renderAt("/support/payment-stops/102/supplement")
    await screen.findByRole("button", { name: "보완 서류 제출" })
    const callsBefore = caseListCalls
    await attachPdf()
    fireEvent.click(screen.getByRole("button", { name: "보완 서류 제출" }))

    expect(
      await screen.findByText(
        "이 이의제기는 지금 보완 서류를 받지 않습니다. 목록에서 진행 상황을 확인하세요.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "다시 제출" })).toBeNull()
    expect(
      screen.getByRole("button", { name: "보완 서류 제출" }),
    ).toBeDisabled()
    await waitFor(() => expect(caseListCalls).toBeGreaterThan(callsBefore))
  })
})
