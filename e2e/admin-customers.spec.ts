import { expect, test, type Page } from "@playwright/test"

/**
 * ADM-01 고객 계정 운영이 서버 API(PH-97)로 동작하는지 MSW 목으로 확인한다.
 * 목은 서버와 같은 검색 규칙, 마스킹, 조회 사유 헤더(PH-89)를 쓴다
 * (src/mocks/handlers/admin-customers-api.ts).
 */
const ADMIN = { userId: "seojunpark", password: "Corebank1!" }

async function openCustomerList(page: Page) {
  await page.goto("/admin/login")
  await page.getByLabel("아이디").fill(ADMIN.userId)
  await page.getByLabel("비밀번호").fill(ADMIN.password)
  await page.getByRole("button", { name: "로그인" }).click()
  await expect(page).toHaveURL("/admin")
  await page.goto("/admin/customers")
}

test("조회 사유를 고르지 않으면 요청하지 않는다(REQ-ADM-019)", async ({
  page,
}) => {
  await openCustomerList(page)

  const requests: string[] = []
  page.on("request", (request) => {
    if (/\/admin\/customers\?/.test(request.url())) requests.push(request.url())
  })

  await page.getByLabel("아이디").fill("mins")
  await page.getByRole("button", { name: "조회", exact: true }).click()

  await expect(page.getByText("조회 사유를 고른 뒤 조회하세요.")).toBeVisible()
  // 입력은 그대로 남는다.
  await expect(page.getByLabel("아이디")).toHaveValue("mins")
  expect(requests).toHaveLength(0)
})

test("조회 전에는 요청하지 않고, 조건 없이 조회하면 서버 문구를 보여준다", async ({
  page,
}) => {
  await openCustomerList(page)

  // 서버가 조건 없는 검색을 거부하므로 첫 화면에서 자동 조회하지 않는다.
  await expect(
    page.getByText("검색 조건을 입력한 뒤 [조회]를 누르세요."),
  ).toBeVisible()

  await page.getByLabel("조회 사유").selectOption("OPERATION")
  await page.getByRole("button", { name: "조회", exact: true }).click()
  await expect(
    page.getByText("검색 조건을 하나 이상 입력해 주세요."),
  ).toBeVisible()
})

test("아이디 앞부분으로 찾은 잠긴 고객의 잠금을 풀면 상세와 목록에 반영된다", async ({
  page,
}) => {
  await openCustomerList(page)

  const reasons: (string | null)[] = []
  page.on("request", (request) => {
    if (request.url().includes("/admin/customers")) {
      reasons.push(request.headers()["x-access-reason"] ?? null)
    }
  })

  await page.getByLabel("조회 사유").selectOption("OPERATION")
  await page.getByLabel("아이디").fill("mins")
  await page.getByRole("button", { name: "조회", exact: true }).click()

  // 서버가 마스킹한 값을 그대로 그린다(앞 4자리 외 마스킹).
  await expect(page.getByText("[총 1건]")).toBeVisible()
  await expect(
    page.getByRole("cell", { name: "mins*****", exact: true }),
  ).toBeVisible()

  await page.getByRole("link", { name: /mins\*{5} \(고객 번호 3\)/ }).click()
  await expect(page.getByText("계정 정보")).toBeVisible()

  await page.getByRole("button", { name: "잠금 해제" }).click()
  await page.getByRole("button", { name: "확인" }).click()

  await expect(page.getByRole("alert")).toContainText(
    "계정 잠금을 해제했습니다",
  )
  // 다시 받은 상세에서 잠금이 풀려 있어 버튼이 비활성으로 바뀐다.
  await expect(page.getByRole("button", { name: "잠금 해제" })).toBeDisabled()

  // 검색, 상세, 변경 요청 모두 고른 사유를 헤더에 싣는다.
  expect(reasons.length).toBeGreaterThanOrEqual(3)
  expect(reasons.every((reason) => reason === "OPERATION")).toBe(true)

  await page.getByRole("link", { name: "← 고객 목록" }).click()
  await page.getByLabel("조회 사유").selectOption("OPERATION")
  await page.getByLabel("아이디").fill("mins")
  await page.getByRole("button", { name: "조회", exact: true }).click()
  await expect(page.getByText("0/5")).toBeVisible()
})

test("사유 없이 상세 주소를 열면 사유부터 고르게 한다", async ({ page }) => {
  await openCustomerList(page)
  await page.goto("/admin/customers/3")

  await expect(page.getByText("고객 개인정보를 열기 전에")).toBeVisible()
  await expect(page.getByText("계정 정보")).toBeHidden()

  await page.getByLabel("조회 사유").selectOption("AUDIT")
  await page.getByRole("button", { name: "확인" }).click()

  await expect(page).toHaveURL(/reason=AUDIT/)
  await expect(page.getByText("계정 정보")).toBeVisible()
})
