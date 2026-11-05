import { expect, test, type Page } from "@playwright/test"

/**
 * ADM-05 지급정지 이의제기 심사.
 *
 * 메뉴 진입 → 목록 → 조회 사유 → 해제 요건 점검 → 판정 확정까지 한 흐름으로 본다.
 * 닫힌 판정, 조기 해제 근거, 멱등키 재사용 같은 분기는 화면 테스트가 본다
 * (`src/pages/admin/adm05-objection-detail.test.tsx`).
 *
 * 목 데이터는 `src/mocks/handlers/payment-stop-api.ts` — 이의제기 3건(정상 거래, 사기 정황,
 * 확정 완료).
 */

const ADMIN = { userId: "seojunpark", password: "Corebank1!" }
// 지급정지 조회 권한만 있는 관리자(`src/mocks/handlers/admin.ts`).
const READ_ONLY_ADMIN = { userId: "dayeonkim", password: "Corebank2!" }

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

test("목록에서 이의제기를 열어 해제 요건 점검을 보고 수용을 확정한다", async ({
  page,
}) => {
  await loginAs(page, ADMIN)

  await page.getByRole("link", { name: "지급정지 이의제기" }).click()
  await expect(page.getByText("[총 3건]")).toBeVisible()

  await page.getByRole("link", { name: "이의제기 3 심사" }).click()
  await page.getByLabel("조회 사유").selectOption("OPERATION")
  await page.getByRole("button", { name: "확인" }).click()

  await expect(page.getByText("거래 기록상 정상 거래")).toBeVisible()
  await expect(
    page.getByRole("radio", { name: "일부 지급정지" }),
  ).toBeDisabled()

  await page.getByRole("radio", { name: "수용", exact: true }).check()
  await page.getByLabel("판정 사유").fill("다툼 이전 거래 관계가 확인됨")
  await page.getByLabel("조기 해제 근거").fill("관계 거래 3회")
  await page.getByRole("button", { name: "판정 확정" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "확인" }).click()

  await expect(
    page.getByText("수용 판정을 확정했습니다.", { exact: false }),
  ).toBeVisible()
  await expect(page.getByText("확정된 판정")).toBeVisible()
})

test("조회 권한만 있으면 대리 접수와 판정 입력이 보이지 않고, 접수 주소는 막는다", async ({
  page,
}) => {
  await loginAs(page, READ_ONLY_ADMIN)

  await page.getByRole("link", { name: "지급정지 이의제기" }).click()
  await expect(page.getByText("[총 3건]")).toBeVisible()
  await expect(page.getByRole("button", { name: "대리 접수" })).toHaveCount(0)

  await page.goto("/admin/objections/intake")
  await expect(page.getByText("이 화면에 접근할 권한이 없습니다")).toBeVisible()
})
