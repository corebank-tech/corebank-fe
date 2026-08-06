import { expect, test } from "@playwright/test"

test("로그인 화면이 렌더링된다", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveTitle(/CoreBank/)
})
