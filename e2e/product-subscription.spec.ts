import { expect, test, type Page } from "@playwright/test"

/**
 * 상품가입 C-03 → C-06 전체 흐름. 서버 역할은 MSW 목이 한다
 * (src/mocks/handlers/product-subscriptions-api.ts 외). 목의 규칙은 서버 구현을
 * 옮긴 것이라, 이 스펙이 깨지면 화면이 서버 계약과 어긋났을 가능성이 크다.
 *
 * 출금계좌는 홍길동의 자유입출금(110632892336, 비밀번호 1234, 잔액 12,340,500원)이다.
 */
const CUSTOMER = { userId: "honggildong", password: "Passw0rd!" }
const WITHDRAWAL_ACCOUNT_NO = "110632892336"
const ACCOUNT_PASSWORD = "1234"

async function login(page: Page) {
  await page.goto("/")
  await page.getByLabel("이용자ID").fill(CUSTOMER.userId)
  await page.getByLabel("비밀번호").fill(CUSTOMER.password)
  await page.getByRole("button", { name: "로그인" }).click()
  await page.waitForURL("**/dashboard")
}

/** C-03 — 약관을 전부 열람하고 동의한 뒤 다음 단계로 간다. */
async function agreeAllTerms(page: Page, productId: number) {
  await page.goto(`/product/${productId}/join/1`)
  const viewButtons = page.getByRole("button", { name: /보기/ })
  await expect(viewButtons.first()).toBeVisible()

  const count = await viewButtons.count()
  for (let i = 0; i < count; i++) {
    await viewButtons.nth(i).click()
    const dialog = page.getByRole("dialog")
    // 약관 전문 목이 없거나 로그인 세션을 못 읽으면 여기서 "불러오지 못했습니다" 가 뜬다.
    await expect(dialog).not.toContainText("불러오는 중")
    await expect(dialog).not.toContainText("불러오지 못했습니다")
    // 모달에 닫기가 둘이다 — 우상단 X(aria-label)와 하단 텍스트 버튼. 텍스트로 하단을 잡는다.
    await dialog.getByText("닫기", { exact: true }).click()
    await expect(dialog).toBeHidden()
  }

  const boxes = page.getByRole("checkbox")
  for (let i = 0; i < (await boxes.count()); i++) {
    const box = boxes.nth(i)
    if ((await box.isEnabled()) && !(await box.isChecked())) await box.check()
  }
  await page.getByRole("button", { name: "다음" }).click()
  await page.waitForURL(`**/product/${productId}/join/2`)
}

/** C-04 — 가입정보를 넣고 서버 검증을 통과해 C-05 로 간다. */
async function fillJoinInfo(
  page: Page,
  productId: number,
  info: { termMonths: number; amount: number },
) {
  await page.locator("#c04-term").fill(String(info.termMonths))
  await page.locator("#c04-account").selectOption(WITHDRAWAL_ACCOUNT_NO)
  await page.locator("#c04-amount").fill(String(info.amount))
  await page.getByRole("button", { name: "다음" }).click()
  await page.waitForURL(`**/product/${productId}/join/3`)
}

async function fillAccountPassword(page: Page, password: string) {
  for (let i = 0; i < password.length; i++) {
    await page.getByLabel(`계좌비밀번호 ${i + 1}번째 자리`).fill(password[i])
  }
}

/** C-05 — 계좌비밀번호 인증 → OTP 발급·검증 → 가입 실행. */
async function authenticateAndSubscribe(page: Page) {
  await fillAccountPassword(page, ACCOUNT_PASSWORD)
  await page.getByRole("button", { name: "인증하고 가입하기" }).click()

  const dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: "OTP 발급" }).click()
  // 서버 설정 expose-code: true 와 같이 목도 발급 응답에 번호를 싣는다.
  const issued = dialog.getByLabel("발급된 OTP 번호")
  await expect(issued).toHaveText(/^\d{6}$/)
  await dialog.getByLabel("OTP 입력").fill((await issued.textContent()) ?? "")
  await dialog.getByRole("button", { name: "확인" }).click()
}

async function subscribe(
  page: Page,
  productId: number,
  info: { termMonths: number; amount: number },
) {
  await agreeAllTerms(page, productId)
  await fillJoinInfo(page, productId, info)
  await authenticateAndSubscribe(page)
}

test.beforeEach(async ({ page }) => {
  await login(page)
})

test("정기예금 가입이 완료되고 자동이체 등록은 권하지 않는다", async ({
  page,
}) => {
  await subscribe(page, 1, { termMonths: 12, amount: 1_000_000 })

  await page.waitForURL("**/product/1/join/4")
  await expect(page.getByText("상품가입이 완료되었습니다.")).toBeVisible()
  await expect(page.getByText("1,000,000원").first()).toBeVisible()
  // 자동이체 프리필은 적금에만 붙는다(서버 ProductSubscriptionResultResponse).
  await expect(page.getByRole("button", { name: "자동이체 등록" })).toHaveCount(
    0,
  )
})

test("정기적금 가입이 완료되면 자동이체 등록으로 이어갈 수 있다", async ({
  page,
}) => {
  await subscribe(page, 2, { termMonths: 12, amount: 100_000 })

  await page.waitForURL("**/product/2/join/4")
  await expect(page.getByText("상품가입이 완료되었습니다.")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "자동이체 등록" }),
  ).toBeVisible()
})

test("계좌비밀번호가 틀리면 서버 문구를 보여주고 OTP 로 넘어가지 않는다", async ({
  page,
}) => {
  await agreeAllTerms(page, 1)
  await fillJoinInfo(page, 1, { termMonths: 12, amount: 1_000_000 })

  await fillAccountPassword(page, "9999")
  await page.getByRole("button", { name: "인증하고 가입하기" }).click()

  await expect(page.getByRole("alert")).toContainText(
    "계좌비밀번호가 일치하지 않습니다.",
  )
  await expect(page.getByRole("dialog")).toHaveCount(0)
})

test("같은 상품에 두 번 가입하면 서버가 거부한다", async ({ page }) => {
  await subscribe(page, 3, { termMonths: 12, amount: 50_000 })
  await page.waitForURL("**/product/3/join/4")

  // 목 상품은 모두 1인 1계좌다(서버 singleAccountLimit → PRD0301).
  await subscribe(page, 3, { termMonths: 12, amount: 50_000 })

  await expect(page.getByText("이미 가입한 상품입니다.")).toBeVisible()
  await expect(page).toHaveURL(/\/product\/3\/join\/3/)
})
