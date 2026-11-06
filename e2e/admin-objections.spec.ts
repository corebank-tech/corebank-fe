import { expect, test, type Page } from "@playwright/test"

/**
 * ADM-05 지급정지 이의제기 심사.
 *
 * 메뉴 진입 → 목록 → 조회 사유 → 소명 완비 확인 → 보완 요청 → 수용 작성 → 승인 대기 →
 * 다른 관리자 승인까지 한 흐름으로 본다.
 * 닫힌 판정, 조기 해제 근거, 멱등키 재사용 같은 분기는 화면 테스트가 본다
 * (`src/pages/admin/adm05-objection-detail.test.tsx`).
 *
 * 목 데이터는 `src/mocks/handlers/payment-stop-api.ts` — 이의제기 5건(완비 확인 전 정상 거래,
 * 기한 임박 사기 정황, 보완 기한 경과, 승인 대기, 확정 완료).
 */

const ADMIN = { userId: "seojunpark", password: "Corebank1!" }
// 지급정지 조회 권한만 있는 관리자(`src/mocks/handlers/admin.ts`).
const READ_ONLY_ADMIN = { userId: "dayeonkim", password: "Corebank2!" }
// 조회와 승인 권한만 있는 관리자. 계약 v2 로컬 시드와 같은 계정이다.
const APPROVER = { userId: "adminapprover", password: "Admin1234!" }

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

test("완비 확인, 보완 요청, 수용 작성 뒤 다른 관리자가 승인해 확정한다", async ({
  page,
}) => {
  await loginAs(page, ADMIN)

  await page.getByRole("link", { name: "지급정지 이의제기" }).click()
  await expect(page.getByText("[총 5건]")).toBeVisible()
  await expect(page.getByText("불수용 대상").first()).toBeVisible()

  await page.getByRole("link", { name: "이의제기 3 심사" }).click()
  await page.getByLabel("조회 사유").selectOption("OPERATION")
  await page.getByRole("button", { name: "확인" }).click()

  const progress = page.getByRole("region", { name: "심사 진행" })
  await expect(progress.getByText("완비 확인 대기")).toBeVisible()
  await progress.getByRole("button", { name: "소명 완비 확인" }).click()
  await expect(progress.getByText("심사 중")).toBeVisible()
  await expect(
    progress.getByRole("status", { name: /심사 기한/ }),
  ).toBeVisible()

  await progress.getByRole("button", { name: "보완 요청 작성" }).click()
  await expect(progress.getByText(/이번 요청은 1회째 보완입니다/)).toBeVisible()
  await progress.getByLabel("요청 사유").fill("거래처 확인 자료 필요")
  await progress.getByLabel("요청 서류").fill("거래처 사업자등록증")
  await progress.getByRole("button", { name: "보완 요청", exact: true }).click()
  await expect(
    progress.getByRole("status", { name: /보완 기한/ }),
  ).toBeVisible()
  await expect(progress.getByText("보완 1회 / 최대 2회")).toBeVisible()

  await expect(
    page.getByRole("radio", { name: "일부 지급정지" }),
  ).toBeDisabled()
  await page.getByRole("radio", { name: "수용", exact: true }).check()
  await page.getByLabel("판정 사유").fill("다툼 이전 거래 관계가 확인됨")
  await page.getByLabel("조기 해제 근거").fill("관계 거래 3회")
  await page.getByRole("button", { name: "승인 요청" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "확인" }).click()

  await expect(
    page.getByText(/수용 판정을 승인 대기로 올렸습니다/),
  ).toBeVisible()
  const pending = page.getByRole("region", { name: "승인 대기 판정" })
  await expect(pending.getByText("관리자 번호 2 (본인)")).toBeVisible()
  // 작성자 본인은 승인 권한이 있어도 승인할 수 없다.
  await expect(pending.getByRole("button", { name: "승인" })).toBeDisabled()

  await page.getByRole("button", { name: "로그아웃" }).click()
  await loginAs(page, APPROVER)
  await page.goto("/admin/objections/3?reason=OPERATION")

  const approval = page.getByRole("region", { name: "승인 대기 판정" })
  await approval.getByRole("button", { name: "승인" }).click()
  await page.getByRole("dialog").getByRole("button", { name: "확인" }).click()

  await expect(page.getByText(/수용 판정을 승인해 확정했습니다/)).toBeVisible()
  await expect(page.getByText("확정된 판정")).toBeVisible()
  await expect(page.getByText("관리자 번호 14")).toBeVisible()
  await expect(
    page.getByRole("region", { name: "심사 진행" }).getByText("판정 확정"),
  ).toBeVisible()
})

test("조회 권한만 있으면 대리 접수와 판정 입력이 보이지 않고, 접수 주소는 막는다", async ({
  page,
}) => {
  await loginAs(page, READ_ONLY_ADMIN)

  await page.getByRole("link", { name: "지급정지 이의제기" }).click()
  await expect(page.getByText("[총 5건]")).toBeVisible()
  await expect(page.getByRole("button", { name: "대리 접수" })).toHaveCount(0)

  await page.goto("/admin/objections/intake")
  await expect(page.getByText("이 화면에 접근할 권한이 없습니다")).toBeVisible()
})

test("AI 분석 단계가 차례로 붙고, 끝나면 판정안과 갈래 차이 경고가 보인다", async ({
  page,
}) => {
  await loginAs(page, ADMIN)

  // 목의 이의제기 2는 처음 조회할 때 분석이 시작돼 약 12초 동안 단계가 쌓인다.
  await page.goto("/admin/objections/2?reason=OPERATION")
  const timeline = page.getByRole("list", { name: "AI 분석 단계" })
  await expect(timeline.getByText("분석 작업 시작")).toBeVisible({
    timeout: 5_000,
  })
  await expect(page.getByText("서버 규칙 결과와 AI 판정안이 다름")).toBeVisible(
    { timeout: 20_000 },
  )
  await expect(timeline.locator("li[data-seq]")).toHaveCount(8)
  await expect(page.getByText("다른 은행 거래내역서").first()).toBeVisible()
})
