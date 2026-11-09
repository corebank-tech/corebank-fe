import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router"
import { http, HttpResponse } from "msw"
import { server } from "@/mocks/server"
import { A08ResetPassword } from "@/pages/auth/a08-reset-password"

const PASSWORD = "Corebank!79"
const CHANGED_PASSWORD = "Another!65"

const renderPage = () => {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <A08ResetPassword />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const mockIssueSuccess = () => {
  server.use(
    http.post("*/auth/password-reset-requests", () =>
      HttpResponse.json({
        code: "0000",
        message: "성공",
        data: {
          passwordResetRequestId: "PRR_test",
          verificationCode: "123456",
          expiresIn: 180,
        },
      }),
    ),
  )
}

const mockResetError = (code: string, message: string) => {
  server.use(
    http.put("*/auth/password-reset-requests/:requestId", () =>
      HttpResponse.json({ code, message, data: null }, { status: 400 }),
    ),
  )
}

const enterPasswordStep = async () => {
  fireEvent.change(screen.getByLabelText(/아이디$/), {
    target: { value: "testuser" },
  })
  fireEvent.change(screen.getByLabelText(/성명$/), {
    target: { value: "테스트" },
  })
  fireEvent.change(screen.getByLabelText(/가입 이메일$/), {
    target: { value: "test@example.com" },
  })

  fireEvent.click(screen.getByRole("button", { name: "본인확인" }))

  const codeInput = await screen.findByLabelText("인증번호 6자리")

  fireEvent.change(codeInput, {
    target: { value: "123456" },
  })

  fireEvent.click(screen.getByRole("button", { name: "다음" }))

  const passwordInput = await screen.findByLabelText(/새 비밀번호$/)

  fireEvent.change(passwordInput, {
    target: { value: PASSWORD },
  })

  fireEvent.change(screen.getByLabelText(/새 비밀번호 확인$/), {
    target: { value: PASSWORD },
  })
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("A08ResetPassword API 오류 처리", () => {
  it("ATH0007이면 인증번호 입력 단계로 돌아간다", async () => {
    mockIssueSuccess()
    mockResetError("ATH0007", "인증번호가 일치하지 않습니다.")

    renderPage()
    await enterPasswordStep()

    fireEvent.click(screen.getByRole("button", { name: "비밀번호 재설정" }))

    expect(
      await screen.findByText("인증번호가 일치하지 않습니다."),
    ).toBeTruthy()

    expect(screen.getByLabelText("인증번호 6자리")).toBeTruthy()

    expect(screen.queryByLabelText(/새 비밀번호$/)).toBeNull()
    expect(screen.queryByText("재설정 완료")).toBeNull()
  })

  it.each([
    ["ATH0008", "인증번호가 만료되었습니다."],
    ["ATH0202", "인증 요청이 유효하지 않습니다."],
  ])("%s이면 인증번호 재발급을 요구한다", async (code, message) => {
    mockIssueSuccess()
    mockResetError(code, message)

    renderPage()
    await enterPasswordStep()

    fireEvent.click(screen.getByRole("button", { name: "비밀번호 재설정" }))

    expect(await screen.findByText(message)).toBeTruthy()

    expect(screen.getByRole("button", { name: "재발급" })).toBeTruthy()

    expect(
      (screen.getByLabelText("인증번호 6자리") as HTMLInputElement).disabled,
    ).toBe(true)
  })

  it("비밀번호가 변경되면 새로운 멱등키를 사용한다", async () => {
    mockIssueSuccess()

    const keys: (string | null)[] = []
    let requestCount = 0

    server.use(
      http.put("*/auth/password-reset-requests/:requestId", ({ request }) => {
        keys.push(request.headers.get("Idempotency-Key"))
        requestCount += 1

        if (requestCount === 1) {
          return HttpResponse.json(
            {
              code: "ATH0003",
              message: "직전 비밀번호는 재사용할 수 없습니다.",
              data: null,
            },
            { status: 400 },
          )
        }

        return HttpResponse.json({
          code: "0000",
          message: "성공",
          data: { changedAt: "2026-11-06T09:00:00+09:00" },
        })
      }),
    )

    renderPage()
    await enterPasswordStep()

    fireEvent.click(screen.getByRole("button", { name: "비밀번호 재설정" }))

    const dialog = (
      await screen.findByText("직전 비밀번호는 재사용할 수 없습니다.")
    ).closest("[role='dialog']") as HTMLElement

    fireEvent.click(within(dialog).getByRole("button", { name: "확인" }))

    fireEvent.change(screen.getByLabelText(/새 비밀번호$/), {
      target: { value: CHANGED_PASSWORD },
    })

    fireEvent.change(screen.getByLabelText(/새 비밀번호 확인$/), {
      target: { value: CHANGED_PASSWORD },
    })

    fireEvent.click(screen.getByRole("button", { name: "비밀번호 재설정" }))

    expect(
      await screen.findByText(
        "비밀번호가 재설정되었습니다. 새 비밀번호로 로그인하세요.",
      ),
    ).toBeTruthy()

    expect(keys).toHaveLength(2)
    expect(keys[0]).toBeTruthy()
    expect(keys[1]).toBeTruthy()
    expect(keys[0]).not.toBe(keys[1])
  })

  it("정상 응답이면 재설정 완료 화면을 표시한다", async () => {
    mockIssueSuccess()

    server.use(
      http.put("*/auth/password-reset-requests/:requestId", () =>
        HttpResponse.json({
          code: "0000",
          message: "성공",
          data: { changedAt: "2026-11-06T09:00:00+09:00" },
        }),
      ),
    )

    renderPage()
    await enterPasswordStep()

    fireEvent.click(screen.getByRole("button", { name: "비밀번호 재설정" }))

    expect(
      await screen.findByText(
        "비밀번호가 재설정되었습니다. 새 비밀번호로 로그인하세요.",
      ),
    ).toBeTruthy()

    expect(screen.queryByLabelText(/새 비밀번호$/)).toBeNull()
  })
})
