import { expect, test, type Page } from "@playwright/test"

/**
 * H-01~H-03 고객 지급정지 이의제기(계획 PA-21). 서버 역할은 MSW 목이 한다
 * (`src/mocks/handlers/payment-stop-customer-api.ts`). 홍길동에게 사건 3건(신청 전,
 * 보완 요청, 심사 중)이 있다.
 *
 * 메뉴 진입 → 신청서 작성 → 서류 첨부 → 확인 → 접수 완료 → 목록 상태 갱신, 그리고 보완
 * 요청 사건의 보완 제출을 본다. 형식 검사, 파일 거부, 재시도 같은 분기는 화면 테스트가
 * 본다(`src/pages/objection/*.test.tsx`).
 */
const CUSTOMER = { userId: "honggildong", password: "Passw0rd!" }

/** 목은 파일 앞 바이트만 본다. 내용은 서명 뒤를 0으로 채운다 */
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(2048),
])
const PDF = Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(4096)])

async function login(page: Page) {
  await page.goto("/")
  await page.getByLabel("이용자ID").fill(CUSTOMER.userId)
  await page.getByLabel("비밀번호").fill(CUSTOMER.password)
  await page.getByRole("button", { name: "로그인" }).click()
  await page.waitForURL("**/dashboard")
}

test("지급정지 사건에 이의제기를 신청하고 접수 번호를 받는다", async ({
  page,
}) => {
  await login(page)
  await page.goto("/support/payment-stops")
  await expect(page.getByText("[총 3건]")).toBeVisible()

  await page.getByRole("link", { name: "110-632-***336 이의제기 신청" }).click()

  // 1단계 신청서 작성
  await page.getByRole("radio", { name: "제2호 정당한 대가로 받은 돈" }).check()
  await page
    .getByLabel("소명 내용")
    .fill(
      "중고 거래 앱에서 노트북을 판매하고 받은 대금입니다. 구매자와 나눈 대화와 거래명세서를 첨부합니다.",
    )
  await page.getByRole("button", { name: "다음" }).click()

  // 2단계 서류 첨부
  await page.getByLabel("신분증 사본 파일 선택").setInputFiles({
    name: "신분증.png",
    mimeType: "image/png",
    buffer: PNG,
  })
  await page.getByLabel("증빙 서류 파일 선택").setInputFiles([
    { name: "대화내역.png", mimeType: "image/png", buffer: PNG },
    { name: "거래명세서.pdf", mimeType: "application/pdf", buffer: PDF },
  ])
  await expect(
    page
      .getByRole("list", { name: "증빙 서류 첨부 목록" })
      .getByRole("listitem"),
  ).toHaveCount(2)
  await page.getByRole("button", { name: "다음" }).click()

  // 3단계 내용 확인
  await expect(page.getByText("제2호 정당한 대가로 받은 돈")).toBeVisible()
  await expect(page.getByText("3개, 9KB")).toBeVisible()
  await page
    .getByLabel("기재한 내용과 첨부한 서류가 사실과 같음을 확인합니다.")
    .check()
  await page.getByRole("button", { name: "제출" }).click()

  // 4단계 접수 완료
  await expect(
    page.getByRole("heading", { name: "이의제기 신청이 접수되었습니다" }),
  ).toBeFocused()
  await expect(page.getByText("접수 번호 203")).toBeVisible()
  await expect(page.getByText(/5영업일 안에 심사 결과/)).toBeVisible()

  await page.getByRole("link", { name: "목록으로" }).click()
  await expect(
    page.getByRole("region", { name: "지급정지 계좌 110-632-***336" }).first(),
  ).toContainText("접수 완료, 서류 확인 중")
})

test("보완 요청을 받은 이의제기에 보완 서류를 낸다", async ({ page }) => {
  await login(page)
  await page.goto("/support/payment-stops")

  await page
    .getByRole("link", { name: "110-632-***336 보완 서류 제출" })
    .click()

  await expect(page.getByText("거래상대방과 주고받은 대화 내역")).toBeVisible()
  await page.getByLabel("보완 서류 파일 선택").setInputFiles({
    name: "계약서.pdf",
    mimeType: "application/pdf",
    buffer: PDF,
  })
  await page.getByLabel("전할 말").fill("요청하신 계약서를 올립니다.")
  await page.getByRole("button", { name: "보완 서류 제출" }).click()

  await expect(page.getByText("보완 서류를 제출했습니다")).toBeVisible()
  await page.getByRole("link", { name: "목록으로" }).click()
  await expect(page.getByText("보완 서류 확인 중")).toBeVisible()
})
