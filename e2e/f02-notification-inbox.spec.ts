import { expect, test, type Page } from "@playwright/test"

/**
 * F-02 알림함 · A-90 헤더 미읽음 배지 · A-09 대시보드 미읽음 요약. 서버 역할은 MSW 목
 * (src/mocks/handlers/notifications-api.ts)이 한다 — 12건 중 4건이 미읽음이다.
 */
const CUSTOMER = { userId: "honggildong", password: "Passw0rd!" }
const INITIAL_UNREAD_COUNT = 4

/** 목의 실패 장면 스위치(notifications-api.ts `FAILURE_SCENE_STORE_KEY`). */
async function chooseFailureScene(page: Page, scene: "list" | "read") {
  await page.evaluate(
    (value) =>
      sessionStorage.setItem(
        "corebank-mock:notifications:failure-scene",
        JSON.stringify(value),
      ),
    scene,
  )
}

async function login(page: Page) {
  await page.goto("/")
  await page.getByLabel("이용자ID").fill(CUSTOMER.userId)
  await page.getByLabel("비밀번호").fill(CUSTOMER.password)
  await page.getByRole("button", { name: "로그인" }).click()
  await page.waitForURL("**/dashboard")
}

const headerBadge = (page: Page) =>
  page.getByRole("button", { name: /^알림 \d+건$/ })

const inboxRows = (page: Page) => page.locator("tbody tr")

test("대시보드 요약과 헤더 배지가 서버의 미읽음 건수를 보여준다", async ({
  page,
}) => {
  await login(page)

  await expect(headerBadge(page)).toHaveAccessibleName(
    `알림 ${INITIAL_UNREAD_COUNT}건`,
  )
  const summary = page.getByRole("region", { name: "미읽음 알림" })
  await expect(summary).toContainText(`미읽음 알림 ${INITIAL_UNREAD_COUNT}건`)
  await expect(summary.locator("li")).toHaveCount(3)
  await expect(summary.locator("li").first()).toContainText(
    "이체가 정상 처리되었습니다.",
  )
})

test("알림함은 서버 페이지 단위로 조회하고 다음 페이지로 넘어간다", async ({
  page,
}) => {
  await login(page)
  await page.goto("/notifications")

  await expect(inboxRows(page)).toHaveCount(10)
  await expect(inboxRows(page).first()).toContainText("2026.11.10 08:41:05")

  await page
    .getByRole("navigation", { name: "페이지 이동" })
    .getByRole("button", { name: "2", exact: true })
    .click()

  await expect(inboxRows(page)).toHaveCount(2)
  await expect(inboxRows(page).first()).toContainText("2026.10.31 15:30:00")
})

test("미읽음 알림을 누르면 읽음으로 바뀌고 헤더 배지가 1 줄어든다", async ({
  page,
}) => {
  await login(page)
  await page.goto("/notifications")

  const firstRow = inboxRows(page).first()
  await expect(firstRow).toContainText("안읽음")
  await firstRow.getByRole("button").click()

  await expect(firstRow).toContainText("읽음")
  await expect(firstRow).not.toContainText("안읽음")
  await expect(headerBadge(page)).toHaveAccessibleName(
    `알림 ${INITIAL_UNREAD_COUNT - 1}건`,
  )
  await expect(
    page.getByText(`미읽음 ${INITIAL_UNREAD_COUNT - 1}건`),
  ).toBeVisible()
})

test("읽음 처리가 실패하면 서버 오류 문구를 보여주고 배지를 그대로 둔다", async ({
  page,
}) => {
  await login(page)
  await chooseFailureScene(page, "read")
  await page.goto("/notifications")

  await inboxRows(page).first().getByRole("button").click()

  await expect(page.getByRole("dialog")).toContainText(
    "알림을 찾을 수 없습니다.",
  )
  await expect(headerBadge(page)).toHaveAccessibleName(
    `알림 ${INITIAL_UNREAD_COUNT}건`,
  )
})

test("목록 조회가 실패하면 빈 목록 대신 서버 오류 문구를 보여준다", async ({
  page,
}) => {
  await login(page)
  await chooseFailureScene(page, "list")
  await page.goto("/notifications")

  await expect(page.getByText("일시적인 오류가 발생했습니다.")).toBeVisible()
  await expect(page.getByText("도착한 알림이 없습니다.")).toHaveCount(0)
})
