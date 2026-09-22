import { expect, test, type Page } from "@playwright/test"

/**
 * 관리자 채널의 인증·인가 경계 검증(#126·#147).
 *
 * 역할·권한은 MSW 가 `GET /customers/me` 에 실어 내려준다(src/mocks/handlers/admin.ts) —
 * 서버 스펙에 아직 그 필드가 없어 목이 그 자리를 대신한다.
 */
const CUSTOMER = { userId: "honggildong", password: "Passw0rd!" }
/** 전 권한 관리자. */
const ADMIN = { userId: "seojunpark", password: "Corebank1!" }
/** 조회 전용 관리자 — CUSTOMER_READ 는 있고 CUSTOMER_WRITE 가 없다. */
const READONLY_ADMIN = { userId: "dayeonkim", password: "Corebank2!" }
/** 회계 전용 관리자 — GL_READ 하나뿐이라 고객 화면 자체가 막힌다(#156). */
const GL_ONLY_ADMIN = { userId: "minjunlee", password: "Corebank3!" }

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

test("관리자 로그인은 고객 계정을 로그인시키지 않는다", async ({ page }) => {
  await page.goto("/admin/login")
  await loginAsAdmin(page, CUSTOMER)

  // 권한 없음을 따로 알리면 "자격증명은 맞았다"가 드러난다(REQ-AUTH-023 취지).
  await expect(page.getByRole("alert")).toContainText(
    "아이디 또는 비밀번호가 올바르지 않습니다",
  )
  await expect(page).toHaveURL(/\/admin\/login/)
})

test("관리자 문으로 들어온 고객 계정은 세션이 남지 않는다", async ({
  page,
}) => {
  await page.goto("/admin/login")
  await loginAsAdmin(page, CUSTOMER)
  await expect(page.getByRole("alert")).toBeVisible()

  // 로그인 실패로 다뤘는데 고객 세션이 살아 있으면 관리자 문이 고객 채널의
  // 뒷문이 된다.
  await page.goto("/dashboard")
  await expect(page).toHaveURL("/")
})

test("고객 세션으로 관리자 화면에 직접 들어가면 403 을 보여준다", async ({
  page,
}) => {
  await page.goto("/")
  await page.getByLabel("이용자ID").fill(CUSTOMER.userId)
  await page.getByLabel("비밀번호").fill(CUSTOMER.password)
  await page.getByRole("button", { name: "로그인" }).click()
  await page.waitForURL("**/dashboard")

  await page.goto("/admin")

  await expect(page.getByText("접근 권한이 없습니다")).toBeVisible()
  // 로그인 화면으로 튕기면 무엇이 거부됐는지 URL 에 남지 않는다.
  await expect(page).toHaveURL(/\/admin/)
})

test("관리자 계정은 관리자 홈에 들어가고 권한이 화면에 드러난다", async ({
  page,
}) => {
  await page.goto("/admin/login")
  await loginAsAdmin(page, ADMIN)

  await expect(page).toHaveURL("/admin")
  await expect(page.getByRole("heading", { name: "관리자 홈" })).toBeVisible()
  // 조회 전용 시나리오와 같은 이유로 exact — 홈의 "변경 권한" 행과 구분한다.
  await expect(page.getByText("변경 가능", { exact: true })).toBeVisible()
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

/* ------------------------------------------------------------------ */
/* 직무분리(PH-49) — 권한이 없는 쪽                                     */
/* ------------------------------------------------------------------ */

test("조회 전용 관리자는 조회 전용으로 표시된다", async ({ page }) => {
  await page.goto("/admin/login")
  await loginAsAdmin(page, READONLY_ADMIN)

  await expect(page).toHaveURL("/admin")
  // `exact` 를 붙이는 이유는 관리자 홈이 "변경 권한: 없음 (조회 전용)" 행을 함께
  // 그리기 때문이다. 부분일치로 찾으면 셸 배지와 그 행이 같이 잡혀 strict mode
  // 위반이 난다 — 여기서 확인하려는 것은 **셸 배지** 쪽이다.
  await expect(page.getByText("조회 전용", { exact: true })).toBeVisible()
  // 변경 권한이 하나도 없으므로 "변경 가능" 배지가 뜨면 안 된다.
  await expect(page.getByText("변경 가능", { exact: true })).toBeHidden()
})

test("조회 전용 관리자도 CUSTOMER_READ 가 있으면 고객 목록을 본다", async ({
  page,
}) => {
  await page.goto("/admin/login")
  await loginAsAdmin(page, READONLY_ADMIN)
  await expect(page).toHaveURL("/admin")

  // 메뉴가 보이는지부터 확인한다 — 권한 필터가 조회 권한까지 잘라내면
  // 관리자가 아무것도 못 보게 된다.
  await page.getByRole("link", { name: "고객 계정 운영" }).click()

  await expect(page).toHaveURL(/\/admin\/customers/)
  await expect(page.getByText("조회조건")).toBeVisible()
})

test("조회 전용 관리자에게 계정 운영 버튼이 보이지 않는다", async ({
  page,
}) => {
  await page.goto("/admin/login")
  await loginAsAdmin(page, READONLY_ADMIN)
  await expect(page).toHaveURL("/admin")

  await page.goto("/admin/customers/3")

  // 상세는 열리지만(CUSTOMER_READ) 변경 액션은 렌더링되지 않는다(CUSTOMER_WRITE 없음).
  await expect(page.getByText("계정 정보")).toBeVisible()
  await expect(page.getByRole("button", { name: "잠금 해제" })).toBeHidden()
  await expect(
    page.getByRole("button", { name: "비밀번호 초기화" }),
  ).toBeHidden()
  await expect(page.getByRole("button", { name: "계정 정지" })).toBeHidden()

  // 왜 버튼이 없는지 화면에서 설명되지 않으면 결함으로 오인된다.
  await expect(page.getByText("조회 전용 권한")).toBeVisible()
})

test("전 권한 관리자에게는 계정 운영 버튼이 보인다", async ({ page }) => {
  await page.goto("/admin/login")
  await loginAsAdmin(page, ADMIN)
  await expect(page).toHaveURL("/admin")

  await page.goto("/admin/customers/3")

  // 위 시나리오의 짝. 버튼이 아예 만들어지지 않은 것과 권한으로 숨긴 것을 구분한다.
  await expect(page.getByRole("button", { name: "잠금 해제" })).toBeVisible()
  await expect(
    page.getByRole("button", { name: "비밀번호 초기화" }),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "계정 정지" })).toBeVisible()
})

/* ------------------------------------------------------------------ */
/* 화면 단위 권한 게이트(REQ-ADM-004) — 주소창으로 들어오는 경로         */
/* ------------------------------------------------------------------ */

test("권한 없는 화면은 URL 로 직접 들어가도 열리지 않는다", async ({
  page,
}) => {
  await page.goto("/admin/login")
  await loginAsAdmin(page, GL_ONLY_ADMIN)
  await expect(page).toHaveURL("/admin")

  // 메뉴에서는 이미 빠져 있다. 그것만으로는 아래 직접 접근을 막지 못한다.
  await expect(page.getByRole("link", { name: "고객 계정 운영" })).toBeHidden()

  await page.goto("/admin/customers")

  await expect(page.getByText("이 화면에 접근할 권한이 없습니다")).toBeVisible()
  // 무엇이 필요한지 말하지 않으면 관리자가 할 수 있는 일이 없다.
  await expect(page.getByText("고객 조회(CUSTOMER_READ)")).toBeVisible()
  // 목록이 그려지지 않아야 한다 — 이 게이트가 생기기 전에는 그려졌다.
  await expect(page.getByText("조회조건")).toBeHidden()
  // 가드가 셸 안쪽에 서므로 네비는 남는다. 막힌 화면에서 갇히지 않는다.
  await expect(page.getByRole("link", { name: "시산표" })).toBeVisible()
})

test("상세 경로도 같은 게이트에 걸린다", async ({ page }) => {
  await page.goto("/admin/login")
  await loginAsAdmin(page, GL_ONLY_ADMIN)
  await expect(page).toHaveURL("/admin")

  // 목록만 막고 상세를 열어 두면 개인정보가 그대로 노출된다.
  await page.goto("/admin/customers/3")

  await expect(page.getByText("이 화면에 접근할 권한이 없습니다")).toBeVisible()
  await expect(page.getByText("계정 정보")).toBeHidden()
})

test("게이트는 권한 있는 화면까지 막지는 않는다", async ({ page }) => {
  await page.goto("/admin/login")
  await loginAsAdmin(page, GL_ONLY_ADMIN)
  await expect(page).toHaveURL("/admin")

  // 위 두 시나리오의 짝. 이게 없으면 "전부 막는 가드"도 통과해 버린다.
  await page.goto("/admin/trial-balance")

  await expect(page.getByText("조회조건")).toBeVisible()
  await expect(page.getByText("이 화면에 접근할 권한이 없습니다")).toBeHidden()
})
