import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router"
import { http, HttpResponse } from "msw"
import { server } from "@/mocks/server"
import { H01MyPaymentStops } from "@/pages/objection/h01-my-payment-stops"
import { H03ObjectionSupplement } from "@/pages/objection/h03-objection-supplement"
import type { MyPaymentStopResponse } from "@/shared/api/generated"

const PDF_HEAD = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]

const REQUESTED: MyPaymentStopResponse = {
  caseId: 102,
  accountNumberMasked: "110-632-***336",
  disputedTotal: 350_000,
  objectionDeadline: "2099-12-31",
  objectionId: 201,
  objectionStatus: "SUPPLEMENT_REQUESTED",
  supplementDue: "2099-11-10",
  missingDocuments: ["거래상대방과 주고받은 대화 내역", "물품 거래 계약서"],
}

const UNDER_REVIEW: MyPaymentStopResponse = {
  caseId: 103,
  accountNumberMasked: "352-0412-****-73",
  disputedTotal: 2_800_000,
  objectionDeadline: "2099-12-31",
  objectionId: 202,
  objectionStatus: "UNDER_REVIEW",
  missingDocuments: [],
}

const NOT_APPLIED: MyPaymentStopResponse = {
  caseId: 101,
  accountNumberMasked: "110-632-***777",
  disputedTotal: 1_200_000,
  objectionDeadline: "2099-12-31",
  missingDocuments: [],
}

let supplementBodies: string[] = []

const useCases = (cases: MyPaymentStopResponse[]) =>
  server.use(
    http.get("*/payment-stops/my", () =>
      HttpResponse.json({ code: "0000", message: "성공", data: cases }),
    ),
  )

const useSupplementReply = () =>
  server.use(
    http.post(
      "*/objections/:objectionId/supplements",
      async ({ request, params }) => {
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

    fireEvent.change(screen.getByLabelText("보완 서류 파일 선택"), {
      target: { files: [new File([new Uint8Array(PDF_HEAD)], "c.pdf")] },
    })
    await screen.findByRole("button", { name: "c.pdf 삭제" })
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
  })
})
