import { expect, test, type Page } from "@playwright/test"

/**
 * ADM-04 대사 불일치 목록(#130-①).
 *
 * 메뉴 진입 · 응답 영업일 표기(REQ-ADM-040) · 페이지 이동을 본다. 차액 방향과 0건
 * 안내는 응답을 바꿔 끼워야 해서 화면 테스트가 본다
 * (`src/pages/admin/adm04-reconciliation-mismatches.test.tsx`).
 *
 * 목 데이터는 `src/mocks/handlers/ledger-reconciliation-api.ts` — 최근 영업일 12건,
 * 그 전 영업일 1건.
 */

const ADMIN = { userId: "seojunpark", password: "Corebank1!" }
// GL_READ 하나뿐인 관리자(`src/mocks/handlers/admin.ts`).
const GL_ONLY_ADMIN = { userId: "minjunlee", password: "Corebank3!" }

async function loginAs(
  page: Page,
  credentials: { userId: string; password: string },
) {
  await page.goto("/admin/login")
  await page.getByLabel("아이디").fill(credentials.userId)
  await page.getByLabel("비밀번호").fill(credentials.password)
  await page.getByRole("button", { name: "로그인" }).click()
  await page.waitForURL("**/admin")
}

test("영업일을 비우고 조회하면 결과 제목에 영업일을 밝히고 10건씩 넘긴다", async ({
  page,
}) => {
  await loginAs(page, ADMIN)

  await page.getByRole("link", { name: "대사 불일치 목록" }).click()

  await expect(page.getByText(/^\[\d{4}\.\d{2}\.\d{2} 영업일\]$/)).toBeVisible()
  await expect(page.getByText("불일치 12건")).toBeVisible()
  await expect(page.locator("tbody tr")).toHaveCount(10)

  await page.getByRole("button", { name: "2", exact: true }).click()

  await expect(page.locator("tbody tr")).toHaveCount(2)
})

test("감사 권한이 없는 관리자에게는 메뉴가 보이지 않는다", async ({ page }) => {
  await loginAs(page, GL_ONLY_ADMIN)

  await expect(page.getByRole("link", { name: "시산표" })).toBeVisible()
  await expect(
    page.getByRole("link", { name: "대사 불일치 목록" }),
  ).toHaveCount(0)
})
