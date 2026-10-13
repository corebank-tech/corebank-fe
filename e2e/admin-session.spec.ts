import { expect, test, type Page } from "@playwright/test"

/**
 * 세션 무조작 만료(POL-001 고객 10분 · POL-A01 관리자 30분).
 *
 * 단위 테스트(`features/session/model/session-provider.test.tsx`)는 `expiredReason` 과
 * `remainingSeconds` 값까지만 본다. **만료가 화면에 어떻게 나타나는지**는 `SessionProvider`
 * 와 `SessionExpiredGate` 와 라우팅이 함께 돌아야 드러난다 — A-11 모달이 뜨는지, [다시
 * 로그인]이 채널에 맞는 곳으로 보내는지(POL-A03)가 그것이다.
 *
 * **30분을 실제로 기다리지 않고 `page.clock` 으로 시계를 당긴다.** 시계를 **멈추는**
 * 선례는 있지만(`visual-baseline.spec.ts` 의 `setFixedTime`) **당기는** 것은 처음이라,
 * 스파이크로 먼저 확인한 것 둘을 적어 둔다(#164).
 *
 * - `fastForward` 는 시계를 점프시키고 타이머는 **한 번만** 발화시킨다. 5초를 당기면
 *   1초 인터벌이 5번이 아니라 1번 울린다. 그래도 만료가 잡히는 이유는 `SessionProvider`
 *   가 틱 횟수를 세지 않고 **마지막 활동 이후 벽시계로 흐른 시간**을 보기 때문이다.
 *   깎는 카운트다운이었다면 `runFor` 로 1800틱을 돌려야 했다.
 * - `clock.install()` 은 페이지를 열기 전에 해야 하고, 설치한 뒤에도 로그인·MSW·쿼리가
 *   정상 동작한다.
 */

const CUSTOMER = { userId: "honggildong", password: "Passw0rd!" }
/** 전 권한 관리자. 권한 가드와 섞이지 않게 조회 전용 계정을 쓰지 않는다. */
const ADMIN = { userId: "seojunpark", password: "Corebank1!" }

/** A-11 모달 본문. 제목은 "세션 만료" 이고 **"세션이 만료" 라는 문구는 없다.** */
const EXPIRED_MESSAGE = "장시간 조작이 없어 자동 로그아웃되었습니다."

async function loginAsCustomer(page: Page) {
  await page.goto("/")
  await page.getByLabel("이용자ID").fill(CUSTOMER.userId)
  await page.getByLabel("비밀번호").fill(CUSTOMER.password)
  await page.getByRole("button", { name: "로그인" }).click()
  await page.waitForURL("**/dashboard")
}

async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login")
  await page.getByLabel("아이디").fill(ADMIN.userId)
  await page.getByLabel("비밀번호").fill(ADMIN.password)
  await page.getByRole("button", { name: "로그인" }).click()
  await page.waitForURL("**/admin")
}

test("관리자는 30분 무조작 뒤 끊기고 관리자 로그인으로 간다", async ({
  page,
}) => {
  await page.clock.install()
  await loginAsAdmin(page)

  await page.clock.fastForward("31:00")

  await expect(page.getByText(EXPIRED_MESSAGE)).toBeVisible()
  await page.getByRole("button", { name: "다시 로그인" }).click()
  await expect(page).toHaveURL(/\/admin\/login$/)
})

test("고객은 10분 무조작 뒤 끊기고 고객 시작 지점으로 간다", async ({
  page,
}) => {
  await page.clock.install()
  await loginAsCustomer(page)

  await page.clock.fastForward("11:00")

  await expect(page.getByText(EXPIRED_MESSAGE)).toBeVisible()
  await page.getByRole("button", { name: "다시 로그인" }).click()
  // POL-A03: 만료 도착지는 보고 있던 채널을 따른다. 고객은 `/` 다.
  await expect(page).toHaveURL(/\/$/)
})

// POL-A01 회귀 방지. 관리자 만료를 고객과 같은 길이로 되돌리면 이 테스트만 잡는다 —
// 위 두 테스트는 둘 다 통과한 채로 남는다.
test("고객 만료 시간이 지나도 관리자 세션은 살아 있다", async ({ page }) => {
  await page.clock.install()
  await loginAsAdmin(page)

  await page.clock.fastForward("11:00")

  await expect(page.getByText(EXPIRED_MESSAGE)).toBeHidden()
  await expect(page).toHaveURL(/\/admin$/)
})
