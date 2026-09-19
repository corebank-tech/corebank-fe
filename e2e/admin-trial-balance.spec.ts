import { expect, test, type Page } from "@playwright/test"

/**
 * ADM-02 시산표(#128).
 *
 * 화면 컴포넌트에만 있는 불변식을 지킨다 — **분류 필터를 집계 뒤에 건다**는 결정이
 * 그것이다. 앞에 걸면 걸러진 계정의 금액이 총계에서 빠져 차대변이 맞지 않게 나오는데,
 * 그건 장부가 틀린 게 아니라 화면이 자른 결과다. 집계 자체는 단위 테스트가 보지만
 * (`entities/gl/lib/aggregate-trial-balance.test.ts`) 화면이 어느 값을 총계 자리에
 * 넘기는지는 여기서만 드러난다.
 */

const ADMIN = { userId: "seojunpark", password: "Corebank1!" }

async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login")
  await page.getByLabel("아이디").fill(ADMIN.userId)
  await page.getByLabel("비밀번호").fill(ADMIN.password)
  await page.getByRole("button", { name: "로그인" }).click()
  await page.waitForURL("**/admin")
}

/** SummaryRow 는 [라벨 셀 | 값 셀] 형제 쌍이라 라벨 다음 형제가 값이다. */
const summaryValue = (page: Page, label: string) =>
  page
    .getByText(label, { exact: true })
    .locator("xpath=following-sibling::div")
    .first()

test("회계 메뉴로 시산표에 들어가면 차대변 총계가 일치한다", async ({
  page,
}) => {
  await loginAsAdmin(page)

  await page.getByRole("link", { name: "시산표" }).click()
  await expect(page.getByText("조회결과")).toBeVisible()

  const debit = await summaryValue(page, "차변 총계").textContent()
  const credit = await summaryValue(page, "대변 총계").textContent()

  expect(debit).toBe(credit)
  await expect(page.getByText("일치", { exact: true })).toBeVisible()
})

test("분류를 걸러도 총계는 기간 전체 기준을 유지한다", async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto("/admin/trial-balance")

  const debitBefore = await summaryValue(page, "차변 총계").textContent()
  const rowsBefore = await page.locator("tbody tr").count()

  await page.getByLabel("계정분류").selectOption("LIABILITY")
  await page.getByRole("button", { name: "조회" }).click()

  expect(await summaryValue(page, "차변 총계").textContent()).toBe(debitBefore)
  expect(await page.locator("tbody tr").count()).toBeLessThan(rowsBefore)
})

test("조회기간을 넓히면 집계 대상 분개가 늘어난다", async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto("/admin/trial-balance")

  // 요약 문구는 계정 수와 분개 줄 수를 함께 담는다. 문자열 전체를 비교하면 분개가
  // **줄어도** 통과하므로 방향을 검증하지 못한다. 숫자를 뽑아 증가를 단언한다.
  const journalEntryCount = async () => {
    const text =
      (await page
        .getByText(/분개 .*줄/)
        .first()
        .textContent()) ?? ""
    const matched = text.match(/분개\s+([\d,]+)줄/)
    expect(matched).not.toBeNull()
    return Number(matched![1].replaceAll(",", ""))
  }

  const before = await journalEntryCount()

  await page.getByRole("button", { name: "3개월" }).click()
  await page.getByRole("button", { name: "조회" }).click()

  expect(await journalEntryCount()).toBeGreaterThan(before)
})

test("역전된 조회기간에서는 조회가 막힌다", async ({ page }) => {
  // PeriodField 는 안내 문구만 그리고 조회를 막지 않는다. 막는 책임은 화면에 있다.
  await loginAsAdmin(page)
  await page.goto("/admin/trial-balance")

  await page.getByLabel("조회 시작일").fill("2026-09-18")
  await page.getByLabel("조회 종료일").fill("2026-09-01")

  await expect(page.getByRole("button", { name: "조회" })).toBeDisabled()
})
