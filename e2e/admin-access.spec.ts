import { expect, test, type Page } from "@playwright/test"

/**
 * 관리자 채널의 인증·인가 경계 검증(#126).
 *
 * 역할은 MSW 가 `GET /customers/me` 에 실어 내려준다(src/mocks/handlers/admin.ts) —
 * 서버 스펙에 아직 역할 필드가 없어 목이 그 자리를 대신한다.
 */
const CUSTOMER = { userId: "honggildong", password: "Passw0rd!" }
const ADMIN = { userId: "seojunpark", password: "Corebank1!" }

async function loginAsAdmin(
  page: Page,
  credentials: { userId: string; password: string },
) {
  await page.getByLabel("아이디").fill(credentials.userId)
  await page.getByLabel("비밀번호").fill(credentials.password)
  await page.getByRole("button", { name: "로그인" }).click()
}

test("비로그인 상태로 관리자 화면에 들어가면 관리자 로그인으로 보낸다", async ({
  page,
}) => {
  await page.goto("/admin")

  // 고객 로그인(/)이 아니라 관리자 로그인이어야 원래 가려던 화면으로 돌아올 수 있다.
  await expect(page).toHaveURL(/\/admin\/login/)
  await expect(
    page.getByRole("heading", { name: "관리자 로그인" }),
  ).toBeVisible()
})

test("고객 계정으로는 관리자 화면 대신 403 안내를 보여준다", async ({
  page,
}) => {
  await page.goto("/admin/login")
  await loginAsAdmin(page, CUSTOMER)

  await expect(page.getByText("접근 권한이 없습니다")).toBeVisible()
  // 로그인 화면으로 튕기면 무엇이 거부됐는지 URL 에 남지 않는다.
  await expect(page).toHaveURL(/\/admin/)
  await expect(page.getByText("관리자 홈")).toBeHidden()
})

test("관리자 계정은 관리자 홈에 들어가고 권한이 화면에 드러난다", async ({
  page,
}) => {
  await page.goto("/admin/login")
  await loginAsAdmin(page, ADMIN)

  await expect(page).toHaveURL("/admin")
  await expect(page.getByRole("heading", { name: "관리자 홈" })).toBeVisible()
  await expect(page.getByText("변경 가능")).toBeVisible()
})

test("관리자 세션은 새로고침해도 유지된다", async ({ page }) => {
  await page.goto("/admin/login")
  await loginAsAdmin(page, ADMIN)
  await expect(page).toHaveURL("/admin")

  await page.reload()

  // 세션 복원 전에 역할을 CUSTOMER 로 단정하면 새로고침마다 403 이 번쩍인다.
  await expect(page.getByText("접근 권한이 없습니다")).toBeHidden()
  await expect(page.getByRole("heading", { name: "관리자 홈" })).toBeVisible()
})
