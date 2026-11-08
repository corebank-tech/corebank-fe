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
import { H02ObjectionApply } from "@/pages/objection/h02-objection-apply"
import type { MyCaseResponse } from "@/shared/api/generated"

const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const PDF_HEAD = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]
const MB = 1024 * 1024

const OPEN_CASE: MyCaseResponse = {
  caseId: 101,
  accountNumberMasked: "110-632-***336",
  disputedTotal: 1_200_000,
  objectionDeadline: "2099-12-31",
  missingDocuments: [],
}

type Captured = { url: string; body: string; idempotencyKey: string | null }
let submits: Captured[] = []
let caseListCalls = 0

const makeFile = (name: string, head: number[], size?: number) => {
  const file = new File([new Uint8Array([...head, 1, 2, 3])], name)
  if (size != null) Object.defineProperty(file, "size", { value: size })
  return file
}

const useCases = (cases: MyCaseResponse[]) =>
  server.use(
    http.get("*/payment-stops/my", () => {
      caseListCalls += 1
      return HttpResponse.json({ code: "0000", message: "성공", data: cases })
    }),
  )

/** 응답을 차례로 돌려준다. 마지막 응답은 그 뒤에도 계속 쓴다 */
const useSubmitReplies = (...replies: (() => Response)[]) => {
  let call = 0
  server.use(
    http.post("*/payment-stops/:caseId/objections", async ({ request }) => {
      // jsdom 의 FormData 는 Node fetch 가 그대로 직렬화하지 못해 파일 내용은 비어서 온다.
      // 칸 이름과 개수, 값만 본문 문자열로 확인한다.
      submits.push({
        url: request.url,
        body: await request.text(),
        idempotencyKey: request.headers.get("Idempotency-Key"),
      })
      const reply = replies[Math.min(call, replies.length - 1)]
      call += 1
      return reply()
    }),
  )
}

const okReply = () =>
  HttpResponse.json({ code: "0000", message: "성공", data: { objectionId: 7 } })

const renderApply = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/support/payment-stops/101/objection"]}>
        <Routes>
          <Route
            path="/support/payment-stops/:caseId/objection"
            element={<H02ObjectionApply />}
          />
          <Route path="/support/payment-stops" element={<p>목록 화면</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const pick = (label: string, files: File[]) =>
  fireEvent.change(screen.getByLabelText(`${label} 파일 선택`), {
    target: { files },
  })

const fillFormStep = async () => {
  fireEvent.click(
    await screen.findByRole("radio", { name: "제2호 정당한 대가로 받은 돈" }),
  )
  fireEvent.change(screen.getByLabelText(/소명 내용/), {
    target: { value: "  노트북 판매 대금입니다.  " },
  })
  fireEvent.click(screen.getByLabelText("일부 지급정지 간소화 절차 신청"))
  fireEvent.click(screen.getByRole("button", { name: "다음" }))
  await screen.findByLabelText("신분증 사본 파일 선택")
}

const attachAndConfirm = async () => {
  pick("신분증 사본", [makeFile("id.png", PNG_HEAD)])
  await screen.findByRole("list", { name: "신분증 사본 첨부 목록" })
  pick("증빙 서류", [
    makeFile("chat.png", PNG_HEAD),
    makeFile("invoice.pdf", PDF_HEAD),
  ])
  await screen.findByRole("button", { name: "invoice.pdf 삭제" })
  fireEvent.click(screen.getByRole("button", { name: "다음" }))
  fireEvent.click(
    await screen.findByLabelText(
      "기재한 내용과 첨부한 서류가 사실과 같음을 확인합니다.",
    ),
  )
}

const fieldValue = (body: string, name: string) =>
  body.match(new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`))?.[1]

const partCount = (body: string, name: string) =>
  body.split(`name="${name}"`).length - 1

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => {
  server.resetHandlers()
  submits = []
  caseListCalls = 0
})
afterAll(() => server.close())

describe("H02ObjectionApply", () => {
  it("사유와 소명이 없으면 다음 단계로 가지 않고 첫 오류 칸에 초점을 둔다", async () => {
    useCases([OPEN_CASE])
    renderApply()

    fireEvent.click(await screen.findByRole("button", { name: "다음" }))

    expect(screen.getByText("이의제기 사유를 고르세요.")).toBeInTheDocument()
    expect(screen.getByText("소명 내용을 입력하세요.")).toBeInTheDocument()
    expect(
      screen.getByRole("radio", { name: "제1호 사기이용계좌 아님" }),
    ).toHaveFocus()
    expect(screen.getByLabelText(/소명 내용/)).toHaveAttribute(
      "aria-describedby",
      expect.stringContaining("apply-statement-error"),
    )
    expect(screen.queryByLabelText("신분증 사본 파일 선택")).toBeNull()
  })

  it("신분증 사본이 없으면 확인 단계로 가지 않는다", async () => {
    useCases([OPEN_CASE])
    renderApply()
    await fillFormStep()

    pick("증빙 서류", [makeFile("chat.png", PNG_HEAD)])
    await screen.findByRole("button", { name: "chat.png 삭제" })
    fireEvent.click(screen.getByRole("button", { name: "다음" }))

    const input = screen.getByLabelText("신분증 사본 파일 선택")
    expect(await screen.findByText("신분증 사본을 첨부하세요.")).toBeVisible()
    expect(input).toHaveFocus()
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(screen.queryByText("신청 내용 확인")).toBeNull()
  })

  it("형식은 확장자가 아니라 파일 앞 바이트로 판정한다", async () => {
    useCases([OPEN_CASE])
    renderApply()
    await fillFormStep()

    pick("증빙 서류", [
      makeFile("renamed.pdf", [0x50, 0x4b, 0x03, 0x04]),
      makeFile("ok.pdf", PDF_HEAD),
      // 서버는 확장자를 보지 않는다. 확장자 없는 PDF, 이름이 .jpg 인 PNG 도 받는다
      makeFile("scan", PDF_HEAD),
      makeFile("capture.jpg", PNG_HEAD),
    ])

    expect(
      await screen.findByText(
        "renamed.pdf: PDF, PNG, JPG 파일만 올릴 수 있습니다. 파일 이름이 아니라 내용으로 형식을 봅니다.",
      ),
    ).toBeInTheDocument()
    const list = screen.getByRole("list", { name: "증빙 서류 첨부 목록" })
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining("ok.pdf"),
      expect.stringContaining("scan"),
      expect.stringContaining("capture.jpg"),
    ])
  })

  it("두 칸을 함께 골라도 합계는 두 칸의 최신 파일로 센다", async () => {
    useCases([OPEN_CASE])
    renderApply()
    await fillFormStep()

    // 검사가 끝나기를 기다리지 않고 두 칸을 잇달아 고른다. 9MB + 8MB x 3 = 33MB
    pick("신분증 사본", [makeFile("id.png", PNG_HEAD, 9 * MB)])
    pick("증빙 서류", [
      makeFile("e1.pdf", PDF_HEAD, 8 * MB),
      makeFile("e2.pdf", PDF_HEAD, 8 * MB),
      makeFile("e3.pdf", PDF_HEAD, 8 * MB),
    ])

    expect(
      await screen.findByText(/e3\.pdf: 첨부 파일 합계는 30MB까지입니다/),
    ).toBeInTheDocument()
    expect(
      within(
        screen.getByRole("list", { name: "증빙 서류 첨부 목록" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(2)
    expect(
      screen.getByRole("list", { name: "신분증 사본 첨부 목록" }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "다음" })).toBeEnabled()
  })

  it("10MB 를 넘는 파일과 9개를 넘는 증빙은 받지 않는다", async () => {
    useCases([OPEN_CASE])
    renderApply()
    await fillFormStep()

    pick("신분증 사본", [makeFile("id.png", PNG_HEAD, 10 * MB + 1)])
    expect(
      await screen.findByText(/id\.png: 파일 하나는 10MB까지/),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("list", { name: "신분증 사본 첨부 목록" }),
    ).toBeNull()

    pick(
      "증빙 서류",
      Array.from({ length: 10 }, (_, i) => makeFile(`e${i}.png`, PNG_HEAD)),
    )
    expect(
      await screen.findByText(
        "파일은 9개까지 올릴 수 있습니다. 넘는 파일은 넣지 않았습니다.",
      ),
    ).toBeInTheDocument()
    expect(
      within(
        screen.getByRole("list", { name: "증빙 서류 첨부 목록" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(9)

    fireEvent.click(screen.getByRole("button", { name: "e0.png 삭제" }))
    expect(screen.getByLabelText("증빙 서류 파일 선택")).toHaveFocus()
    expect(
      within(
        screen.getByRole("list", { name: "증빙 서류 첨부 목록" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(8)
  })

  it("확인 후 제출하면 multipart 로 보내고 접수 번호를 보인다", async () => {
    useCases([OPEN_CASE])
    useSubmitReplies(okReply)
    renderApply()
    await fillFormStep()
    await attachAndConfirm()

    expect(screen.getByText("제2호 정당한 대가로 받은 돈")).toBeInTheDocument()
    expect(screen.getByText("노트북 판매 대금입니다.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "제출" }))

    const heading = await screen.findByRole("heading", {
      name: "이의제기 신청이 접수되었습니다",
    })
    expect(heading).toHaveFocus()
    expect(screen.getByText("7")).toBeInTheDocument()
    expect(screen.getByText(/5영업일 안에 심사 결과/)).toBeInTheDocument()
    // 서버는 문자를 보내지 않는다(통지는 기록만). 보내 준다고 약속하지 않는다
    expect(screen.queryByText(/문자/)).toBeNull()

    expect(submits).toHaveLength(1)
    const [{ url, body, idempotencyKey }] = submits
    expect(idempotencyKey).toBeTruthy()
    // 소명 원문이 주소(쿼리 문자열)에 실리지 않는다
    expect(new URL(url).search).toBe("")
    expect(fieldValue(body, "clause")).toBe("2")
    expect(fieldValue(body, "statement")).toBe("노트북 판매 대금입니다.")
    expect(fieldValue(body, "simplifiedRequested")).toBe("true")
    expect(fieldValue(body, "litigationPending")).toBe("false")
    expect(partCount(body, "idCopy")).toBe(1)
    expect(partCount(body, "evidence")).toBe(2)
  })

  it("확인에 동의하지 않으면 제출하지 않는다", async () => {
    useCases([OPEN_CASE])
    useSubmitReplies(okReply)
    renderApply()
    await fillFormStep()
    await attachAndConfirm()

    const agree = screen.getByLabelText(
      "기재한 내용과 첨부한 서류가 사실과 같음을 확인합니다.",
    )
    fireEvent.click(agree)
    fireEvent.click(screen.getByRole("button", { name: "제출" }))

    expect(
      screen.getByText("내용 확인에 동의해야 제출할 수 있습니다."),
    ).toBeInTheDocument()
    expect(agree).toHaveFocus()
    expect(submits).toHaveLength(0)
  })

  it("제출이 실패하면 입력을 지우지 않고 같은 멱등키로 다시 낸다", async () => {
    useCases([OPEN_CASE])
    useSubmitReplies(() => HttpResponse.error(), okReply)
    renderApply()
    await fillFormStep()
    await attachAndConfirm()

    fireEvent.click(screen.getByRole("button", { name: "제출" }))

    expect(await screen.findByText("제출하지 못했습니다")).toBeInTheDocument()
    expect(
      screen.getByText("네트워크 연결을 확인한 뒤 다시 시도하세요."),
    ).toBeInTheDocument()
    // 확인 단계에 그대로 있고 고른 파일도 남아 있다
    expect(screen.getByText("invoice.pdf")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "다시 제출" }))

    expect(
      await screen.findByRole("heading", {
        name: "이의제기 신청이 접수되었습니다",
      }),
    ).toBeInTheDocument()
    expect(submits).toHaveLength(2)
    expect(submits[1].idempotencyKey).toBe(submits[0].idempotencyKey)
  })

  it("서버 거부 문구를 그대로 보이고 이전 단계로 돌아가 파일을 바꿀 수 있다", async () => {
    useCases([OPEN_CASE])
    useSubmitReplies(() =>
      HttpResponse.json(
        { code: "PST0007", message: "첨부 파일의 형식을 확인하세요." },
        { status: 400 },
      ),
    )
    renderApply()
    await fillFormStep()
    await attachAndConfirm()
    fireEvent.click(screen.getByRole("button", { name: "제출" }))

    expect(
      await screen.findByText("첨부 파일의 형식을 확인하세요."),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "이전" }))
    expect(
      screen.getByRole("button", { name: "invoice.pdf 삭제" }),
    ).toBeInTheDocument()
  })

  it("다시 내도 같은 결과인 거부(PST0304)면 다시 제출 대신 목록으로 안내하고 목록을 다시 받는다", async () => {
    useCases([OPEN_CASE])
    useSubmitReplies(() =>
      HttpResponse.json(
        { code: "PST0304", message: "이미 이의제기가 접수된 사건입니다." },
        { status: 409 },
      ),
    )
    renderApply()
    await fillFormStep()
    await attachAndConfirm()
    const callsBefore = caseListCalls
    fireEvent.click(screen.getByRole("button", { name: "제출" }))

    expect(
      await screen.findByText("이미 이의제기가 접수된 사건입니다."),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/이 사건은 다시 제출해도 접수되지 않습니다/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "지급정지 이의제기 목록" }),
    ).toHaveAttribute("href", "/support/payment-stops")
    expect(screen.queryByRole("button", { name: "다시 제출" })).toBeNull()
    expect(screen.getByRole("button", { name: "제출" })).toBeDisabled()
    await waitFor(() => expect(caseListCalls).toBeGreaterThan(callsBefore))
  })

  it("이미 신청한 사건이면 신청서를 열지 않는다", async () => {
    useCases([
      { ...OPEN_CASE, objectionId: 5, objectionStatus: "UNDER_REVIEW" },
    ])
    renderApply()

    expect(
      await screen.findByText("이미 이의제기를 신청한 사건입니다."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("radio")).toBeNull()
  })
})
