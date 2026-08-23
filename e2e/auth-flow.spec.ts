import { expect, test, type Page } from "@playwright/test"

/**
 * 로그인·로그아웃 흐름 검증. MSW 핸들러(src/mocks/handlers/auth.ts)가 서버 역할을
 * 하므로 실서버 계정 없이 돌고, POL-003 계정 잠금 위험도 없다.
 */
const CREDENTIALS = { userId: "honggildong", password: "Passw0rd!" }

async function fillLogin(page: Page, password: string) {
  await page.getByLabel("이용자ID").fill(CREDENTIALS.userId)
  await page.getByLabel("비밀번호").fill(password)
  await page.getByRole("button", { name: "로그인" }).click()
}

test("로그인 실패는 세션만료 안내가 아니라 로그인 실패 문구를 보여준다", async ({
  page,
}) => {
  await page.goto("/")
  await fillLogin(page, "WrongPassw0rd!")

  await expect(page.getByRole("alert")).toContainText(
    "아이디 또는 비밀번호가 올바르지 않습니다.",
  )
  // 로그인 실패도 401 이라 상태코드로만 판정하면 A-11 안내가 뜬다.
  await expect(page.getByText("세션이 만료")).toBeHidden()
})

test("입력을 고치면 이전 실패 안내가 사라진다", async ({ page }) => {
  await page.goto("/")
  await fillLogin(page, "WrongPassw0rd!")
  await expect(page.getByRole("alert")).toBeVisible()

  await page.getByLabel("비밀번호").fill(CREDENTIALS.password)

  await expect(page.getByRole("alert")).toBeHidden()
})

test("로그인 후 새로고침해도 로그인 상태가 유지된다", async ({ page }) => {
  await page.goto("/")
  await fillLogin(page, CREDENTIALS.password)
  await page.waitForURL("**/dashboard")

  await page.reload()

  await expect(page).toHaveURL(/dashboard/)
  // 헤더 이름은 마스킹된 서버 값(GET /customers/me)을 쓴다.
  await expect(page.getByText("홍*동")).toBeVisible()
})

test("보호된 화면은 로그인 후 원래 경로로 되돌아온다", async ({ page }) => {
  await page.goto("/accounts")
  await expect(page).toHaveURL("/")

  await fillLogin(page, CREDENTIALS.password)

  await expect(page).toHaveURL(/accounts/)
})

test("로그아웃하면 A-10 으로 가고 보호 화면 접근이 막힌다", async ({
  page,
}) => {
  await page.goto("/")
  await fillLogin(page, CREDENTIALS.password)
  await page.waitForURL("**/dashboard")

  await page.getByRole("button", { name: "로그아웃" }).click()

  await expect(page).toHaveURL(/logout/)
  await expect(page.getByText("로그아웃 되었습니다.")).toBeVisible()

  await page.goto("/dashboard")
  await expect(page).toHaveURL("/")
})
