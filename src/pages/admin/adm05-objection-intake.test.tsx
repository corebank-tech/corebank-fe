import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router"
import { http, HttpResponse } from "msw"
import { server } from "@/mocks/server"
import { Adm05ObjectionIntake } from "@/pages/admin/adm05-objection-intake"

const TX_A = "TR202611020000000001"

let registerBodies: unknown[] = []
let receiveBodies: unknown[] = []

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const PDF = new TextEncoder().encode("%PDF-1.4\n")

type UploadCall = { kind: string | null; key: string | null; files: string[] }
let uploadCalls: UploadCall[] = []

const renderIntake = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Adm05ObjectionIntake />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const fillRegister = (transactions: string) => {
  fireEvent.change(screen.getByLabelText(/계좌 ID/), {
    target: { value: "2005" },
  })
  fireEvent.change(screen.getByLabelText(/다툼 거래 번호/), {
    target: { value: transactions },
  })
  fireEvent.change(screen.getByLabelText(/신청 기한/), {
    target: { value: "2026-12-31" },
  })
  fireEvent.click(screen.getByRole("button", { name: "사건 등록" }))
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => {
  server.resetHandlers()
  registerBodies = []
  receiveBodies = []
  uploadCalls = []
})
afterAll(() => server.close())

describe("Adm05ObjectionIntake", () => {
  it("거래 번호 형식이 틀리면 등록을 요청하지 않는다", () => {
    renderIntake()

    fillRegister("TR2026-1")

    expect(
      screen.getByText(/거래 번호는 영문 대문자와 숫자 20자리입니다/),
    ).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("등록한 사건 번호로 이의제기 접수를 이어 간다", async () => {
    server.use(
      http.post("*/admin/payment-stops", async ({ request }) => {
        registerBodies.push(await request.json())
        return HttpResponse.json({
          code: "0000",
          message: "성공",
          data: { caseId: 21 },
        })
      }),
      http.post("*/admin/objections", async ({ request }) => {
        receiveBodies.push(await request.json())
        return HttpResponse.json(
          {
            code: "PST0003",
            message: "신분증 사본 확인과 이의제기 사유가 필요합니다.",
          },
          { status: 400 },
        )
      }),
    )
    renderIntake()

    fillRegister(`${TX_A.toLowerCase()}\n`)
    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "확인" }))

    expect(
      await screen.findByText(
        "사건 번호 21로 등록하고 계좌를 전부 지급정지했습니다.",
      ),
    ).toBeInTheDocument()
    expect(registerBodies).toEqual([
      {
        accountId: 2005,
        disputedTransactionNumbers: [TX_A],
        objectionDeadline: "2026-12-31",
      },
    ])
    expect(screen.getByLabelText(/사건 번호/)).toHaveValue("21")

    fireEvent.click(
      screen.getByRole("radio", { name: "제1호 사기이용계좌 아님" }),
    )
    fireEvent.change(screen.getByLabelText(/소명 내용/), {
      target: { value: "모르는 사람이 보낸 돈입니다." },
    })
    fireEvent.click(screen.getByRole("button", { name: "이의제기 접수" }))

    // 신분증 사본 확인은 업무 규칙이라 서버가 판정하고, 화면은 서버 문구를 보인다.
    expect(
      await screen.findByText("신분증 사본 확인과 이의제기 사유가 필요합니다."),
    ).toBeInTheDocument()
    expect(receiveBodies).toEqual([
      {
        caseId: 21,
        clause: 1,
        statement: "모르는 사람이 보낸 돈입니다.",
        simplifiedRequested: false,
        idCopyConfirmed: false,
        litigationPending: false,
      },
    ])
  })

  it("접수 뒤 서류를 종류별로 올리고, 실패한 종류만 같은 멱등키로 다시 올린다", async () => {
    server.use(
      http.post("*/admin/objections", () =>
        HttpResponse.json({
          code: "0000",
          message: "성공",
          data: { objectionId: 41 },
        }),
      ),
      http.post(
        "*/admin/objections/:objectionId/documents",
        async ({ request }) => {
          // jsdom 의 File 은 Node 의 formData 해석기가 받지 않고 파일 이름도 남지 않는다.
          // 본문 글자에서 파일 칸 수만 센다.
          const body = await request.text()
          const call = {
            kind: body.match(/name="kind"\r?\n\r?\n([A-Z_]+)/)?.[1] ?? null,
            key: request.headers.get("Idempotency-Key"),
            files: [...body.matchAll(/name="files"; filename="([^"]+)"/g)].map(
              (match) => match[1],
            ),
          }
          uploadCalls.push(call)
          const failEvidence =
            call.kind === "EVIDENCE" &&
            uploadCalls.filter((item) => item.kind === "EVIDENCE").length === 1
          return failEvidence
            ? HttpResponse.json(
                { code: "CMN9999", message: "일시적인 오류입니다." },
                { status: 500 },
              )
            : HttpResponse.json({
                code: "0000",
                message: "성공",
                data: call.files.map((name, index) => ({
                  documentId: 900 + index,
                  kind: call.kind,
                  fileName: name,
                })),
              })
        },
      ),
    )
    renderIntake()

    fireEvent.change(screen.getByLabelText(/사건 번호/), {
      target: { value: "21" },
    })
    fireEvent.click(
      screen.getByRole("radio", { name: "제1호 사기이용계좌 아님" }),
    )
    fireEvent.change(screen.getByLabelText(/소명 내용/), {
      target: { value: "모르는 사람이 보낸 돈입니다." },
    })
    fireEvent.click(screen.getByRole("button", { name: "이의제기 접수" }))

    const section = await screen.findByRole("region", { name: "서류 업로드" })
    fireEvent.change(within(section).getByLabelText("신분증 사본 파일 선택"), {
      target: {
        files: [new File([PNG], "신분증.png", { type: "image/png" })],
      },
    })
    fireEvent.change(within(section).getByLabelText("증빙 서류 파일 선택"), {
      target: {
        files: [new File([PDF], "거래내역.pdf", { type: "application/pdf" })],
      },
    })
    await within(section).findByText("신분증.png")
    await within(section).findByText("거래내역.pdf")

    fireEvent.click(
      within(section).getByRole("button", { name: "서류 올리기" }),
    )

    // 신분증 사본은 올라가고 증빙만 실패한다. 접수는 그대로 남는다.
    expect(
      await within(section).findByText("신분증 사본 1개를 올렸습니다."),
    ).toBeInTheDocument()
    expect(
      await within(section).findByText(/증빙 서류를 올리지 못했습니다/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/이의제기 번호 41로 접수했습니다/),
    ).toBeInTheDocument()

    fireEvent.click(
      within(section).getByRole("button", { name: "실패한 서류 다시 올리기" }),
    )
    expect(
      await within(section).findByText("증빙 서류 1개를 올렸습니다."),
    ).toBeInTheDocument()

    await waitFor(() => expect(uploadCalls).toHaveLength(3))
    const [idCopy, firstEvidence, retryEvidence] = uploadCalls
    expect(idCopy.kind).toBe("ID_COPY")
    expect(idCopy.files).toHaveLength(1)
    expect(firstEvidence.kind).toBe("EVIDENCE")
    expect(firstEvidence.files).toHaveLength(1)
    // 실패한 증빙은 같은 내용이라 같은 키로 다시 보낸다. 종류가 다르면 키도 다르다.
    expect(retryEvidence.key).toBe(firstEvidence.key)
    expect(idCopy.key).not.toBe(firstEvidence.key)
  })
})
