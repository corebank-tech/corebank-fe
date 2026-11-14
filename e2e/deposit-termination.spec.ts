import { expect, test, type Page } from "@playwright/test"

/**
 * 예·적금 중도해지 B-02 → 예상 지급액 → 인증·해지 → 완료. 서버 역할은 MSW 목이 한다
 * (src/mocks/handlers/deposit-termination-api.ts). 계좌 픽스처에는 만기가 지난 계좌가 없어
 * 만기해지 화면은 이 시나리오로 밟지 못한다.
 */
const CUSTOMER = { userId: "honggildong", password: "Passw0rd!" }
const DEPOSIT_PASSWORD = "1234"
const WRONG_PASSWORD = "0000"
const TARGET_ACCOUNT = "정기예금 1년"

async function login(page: Page) {
  await page.goto("/")
  await page.getByLabel("이용자ID").fill(CUSTOMER.userId)
  await page.getByLabel("비밀번호").fill(CUSTOMER.password)
  await page.getByRole("button", { name: "로그인" }).click()
  await page.waitForURL("**/dashboard")
}

async function fillAccountPassword(page: Page, password: string) {
  for (let i = 0; i < password.length; i++) {
    await page.getByLabel(`계좌비밀번호 ${i + 1}번째 자리`).fill(password[i])
  }
}

const targetRow = (page: Page) =>
  page.getByRole("row", { name: new RegExp(TARGET_ACCOUNT) })

async function openEarlyTermination(page: Page) {
  await page.goto("/accounts/deposits")
  await targetRow(page).getByRole("button", { name: "중도해지" }).click()
  await expect(page.getByText("예상 지급액", { exact: true })).toBeVisible()
}

async function terminateEarly(page: Page) {
  await openEarlyTermination(page)
  await page.getByLabel(/중도해지이율 적용과 해지 후 복구할 수 없음/).check()
  await page.getByRole("button", { name: "다음" }).click()
  await fillAccountPassword(page, DEPOSIT_PASSWORD)
  await page.getByRole("button", { name: "중도해지하기" }).click()
  await expect(page.getByText("중도해지가 완료되었습니다.")).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await login(page)
})

test("만기 전 계좌는 목록에서 D-n 과 [중도해지]가 보인다", async ({ page }) => {
  await page.goto("/accounts/deposits")

  await expect(targetRow(page).getByText(/D-\d+/)).toBeVisible()
  await expect(
    targetRow(page).getByRole("button", { name: "중도해지" }),
  ).toBeVisible()
})

test("유의사항을 확인해야 다음으로 갈 수 있다", async ({ page }) => {
  await openEarlyTermination(page)

  const next = page.getByRole("button", { name: "다음" })
  await expect(next).toBeDisabled()

  await page.getByLabel(/중도해지이율 적용과 해지 후 복구할 수 없음/).check()
  await expect(next).toBeEnabled()
})

test("비밀번호가 틀리면 해지되지 않고, 맞으면 완료 화면과 목록 반영까지 간다", async ({
  page,
}) => {
  await openEarlyTermination(page)
  await page.getByLabel(/중도해지이율 적용과 해지 후 복구할 수 없음/).check()
  await page.getByRole("button", { name: "다음" }).click()

  await fillAccountPassword(page, WRONG_PASSWORD)
  await page.getByRole("button", { name: "중도해지하기" }).click()
  await expect(page.getByRole("alert")).toContainText(
    "계좌비밀번호가 일치하지 않습니다.",
  )
  await expect(page.getByText("중도해지가 완료되었습니다.")).toHaveCount(0)

  await fillAccountPassword(page, DEPOSIT_PASSWORD)
  await page.getByRole("button", { name: "중도해지하기" }).click()

  await expect(page.getByText("중도해지가 완료되었습니다.")).toBeVisible()
  await expect(page.getByText("실제 지급액")).toBeVisible()

  await page.getByRole("button", { name: "예·적금 계좌목록" }).click()
  await expect(page.getByText("내집마련적금")).toBeVisible()
  await expect(targetRow(page)).toHaveCount(0)
})

test("2단계를 직접 열면 처음부터 다시 진행하도록 안내한다", async ({
  page,
}) => {
  await openEarlyTermination(page)
  const step1Url = page.url()

  await page.goto(step1Url.replace(/\/1$/, "/2"))

  await expect(page.getByText("해지 정보를 확인할 수 없습니다.")).toBeVisible()
})

test("해지 뒤 뒤로 가기로 인증 단계가 다시 열리지 않는다", async ({ page }) => {
  await terminateEarly(page)

  await page.goBack()

  await expect(
    page.getByText("중도해지 예상 지급액을 불러오지 못했습니다."),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "중도해지하기" })).toHaveCount(
    0,
  )
})
