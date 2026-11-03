import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router"
import { http, HttpResponse } from "msw"
import { server } from "@/mocks/server"
import { A04Info } from "@/pages/auth/a04-info"
import type { SignupAuthState, SignupData } from "@/pages/auth/signup-shared"

/**
 * 정보입력 [다음]에서 앞 단계 토큰이 만료되면(ATH0104, ATH0105) 이 화면에 머물지 않고
 * 약관동의부터 다시 하게 한다(#203). 다른 오류는 이 화면에서 안내만 한다.
 */

const DATA: SignupData = {
  name: "정하은",
  birth: "950303",
  phone: "01011111111",
  email: "uat1104p3@example.com",
  userId: "uat1104p3",
  password: "Corebank!7395",
  passwordConfirm: "Corebank!7395",
}

const AUTH: SignupAuthState = {
  termsAuthToken: "terms-token",
  accountAuthToken: "account-token",
  userIdCheckToken: "id-token",
  checkedUserId: DATA.userId,
  emailVerificationId: "email-request",
  emailVerificationToken: "email-token",
  verifiedEmail: DATA.email,
}

const respondValidateWith = (code: string, message: string, status: number) =>
  server.use(
    http.post("*/auth/signup/validate", () =>
      HttpResponse.json({ code, message, data: null }, { status }),
    ),
  )

const renderPage = (onRestart: () => void) => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <A04Info
          data={DATA}
          auth={AUTH}
          onChange={() => {}}
          onAuthChange={() => {}}
          onNext={() => {}}
          onRestart={onRestart}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const submitAndOpenDialog = async (message: string) => {
  fireEvent.click(screen.getByRole("button", { name: "다음" }))
  return (await screen.findByText(message)).closest(
    "[role='dialog']",
  ) as HTMLElement
}

const confirm = (dialog: HTMLElement) =>
  fireEvent.click(within(dialog).getByRole("button", { name: "확인" }))

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("A04Info 앞 단계 토큰 만료", () => {
  it.each([
    ["ATH0104", "약관 동의 토큰이 유효하지 않습니다."],
    ["ATH0105", "계좌 인증 토큰이 유효하지 않습니다."],
  ])("%s 이면 안내 뒤 약관동의부터 다시 하게 한다", async (code, message) => {
    respondValidateWith(code, message, 403)
    const onRestart = vi.fn()
    renderPage(onRestart)

    const dialog = await submitAndOpenDialog(message)
    expect(
      within(dialog).getByText("회원가입을 약관동의부터 다시 진행합니다."),
    ).toBeTruthy()
    expect(onRestart).not.toHaveBeenCalled()

    confirm(dialog)
    expect(onRestart).toHaveBeenCalledTimes(1)
  })

  it("다른 오류는 이 화면에서 안내만 한다", async () => {
    respondValidateWith("ATH0001", "비밀번호 규칙에 맞지 않습니다.", 400)
    const onRestart = vi.fn()
    renderPage(onRestart)

    const dialog = await submitAndOpenDialog("비밀번호 규칙에 맞지 않습니다.")
    expect(
      within(dialog).queryByText("회원가입을 약관동의부터 다시 진행합니다."),
    ).toBeNull()

    confirm(dialog)
    expect(onRestart).not.toHaveBeenCalled()
  })
})
