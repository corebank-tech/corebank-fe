import { expect, test } from "@playwright/test"

/**
 * ADM-03 정보계 대시보드(#146).
 *
 * 메뉴 진입과 숫자 3개의 기준시점 표기를 본다. 기준시점 없는 응답·한 API 실패는
 * 응답을 바꿔 끼워야 해서 화면 테스트가 본다
 * (`src/pages/admin/adm03-info-dashboard.test.tsx`).
 *
 * 권한은 `GL_READ`(D-09)다. 목 관리자 셋이 모두 `GL_READ` 를 가져 막히는 쪽은 이
 * 화면에서 밟을 계정이 없다 — 게이트 자체는 `admin-access.spec.ts` 가 본다.
 * 목 데이터는 `src/mocks/handlers/info-api.ts`.
 */

// GL_READ 하나뿐인 관리자(`src/mocks/handlers/admin.ts`).
const GL_ONLY_ADMIN = { userId: "minjunlee", password: "Corebank3!" }

test("회계 권한만 있는 관리자가 메뉴로 들어가면 숫자마다 기준시점이 붙어 있다", async ({
  page,
}) => {
  await page.goto("/admin/login")
  await page.getByLabel("아이디").fill(GL_ONLY_ADMIN.userId)
  await page.getByLabel("비밀번호").fill(GL_ONLY_ADMIN.password)
  await page.getByRole("button", { name: "로그인" }).click()
  await page.waitForURL("**/admin")

  await page.getByRole("link", { name: "정보계 대시보드" }).click()

  const withAsOf = /^[\d,]+(원|건)\(기준 \d{4}-\d{2}-\d{2} 마감\)$/
  await expect(page.getByText(withAsOf)).toHaveCount(3)
  await expect(page.getByText(/^\d{4}년 \d{1,2}월 신규 가입$/)).toBeVisible()
})
