import { expect, test } from "@playwright/test"

test("로그인 화면이 렌더링된다", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveTitle(/CoreBank/)
})

test("없는 주소는 라우터 기본 오류 화면 대신 안내 화면을 보여준다", async ({
  page,
}) => {
  // 오타 URL·오래된 북마크로 바로 도달하는 경로다.
  await page.goto("/no-such-page")

  await expect(page.getByText("페이지를 찾을 수 없습니다")).toBeVisible()
  await expect(page.getByText("Unexpected Application Error")).toBeHidden()
})
