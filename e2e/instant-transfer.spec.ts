import { expect, test, type Page } from "@playwright/test"

/**
 * 즉시이체 D-01 → D-03 (FE B-8 당행·타행). 서버 역할은 MSW 목이 한다
 * (src/mocks/handlers/transfer-api.ts). 타행 장면은 그 파일 머리의 계좌번호 표를 쓴다.
 *
 * 출금계좌는 홍길동의 자유입출금(110632892336, 비밀번호 1234)이다.
 */
const CUSTOMER = { userId: "honggildong", password: "Passw0rd!" }
const ACCOUNT_PASSWORD = "1234"
const OWN_BANK = "CoreBank(당행)"
const OTHER_BANK = "KB국민은행"

const INTERBANK = {
  OK: "1234567890123",
  SLOW: "1234567890006",
  NOT_FOUND: "1234567890001",
  SUSPENDED: "1234567890002",
  UNCONFIRMED: "1234567890009",
  NOT_PROCESSED: "1234567890007",
  TIMEOUT: "1234567890008",
} as const

async function login(page: Page) {
  await page.goto("/")
  await page.getByLabel("이용자ID").fill(CUSTOMER.userId)
  await page.getByLabel("비밀번호").fill(CUSTOMER.password)
  await page.getByRole("button", { name: "로그인" }).click()
  await page.waitForURL("**/dashboard")
}

async function fillAccountPassword(page: Page) {
  for (let i = 0; i < ACCOUNT_PASSWORD.length; i++) {
    await page
      .getByLabel(`계좌비밀번호 ${i + 1}번째 자리`)
      .fill(ACCOUNT_PASSWORD[i])
  }
}

/** D-01 — 은행·계좌를 넣고 계좌확인까지 한다. */
async function confirmPayee(page: Page, bank: string, accountNo: string) {
  await page.goto("/instant-transfer")
  // 은행 목록 응답이 와야 선택지가 생긴다 — selectOption 이 그때까지 기다린다.
  await page.locator("#it-bank").selectOption({ label: bank })
  await fillAccountPassword(page)
  await page.locator("#it-to").fill(accountNo)
  await page.getByRole("button", { name: "계좌확인" }).click()
}

/** D-01 금액 → D-02 확인 → 거래내용 확인 → 계좌비밀번호 → OTP → D-03. */
async function transfer(page: Page, amount: number) {
  await page.locator("#it-amount").fill(String(amount))
  await page.getByRole("button", { name: "다음" }).click()
  await page.getByRole("button", { name: "이체하기" }).click()

  const confirm = page.getByRole("dialog")
  await confirm.getByRole("button", { name: "확인" }).click()

  const otp = page.getByRole("dialog")
  await otp.getByRole("button", { name: "OTP 발급" }).click()
  const issued = otp.getByLabel("발급된 OTP 번호")
  await expect(issued).toHaveText(/^\d{6}$/)
  await otp.getByLabel("OTP 입력").fill((await issued.textContent()) ?? "")
  await otp.getByRole("button", { name: "확인" }).click()
}

/**
 * 계좌확인 뒤 표시되는 예금주. "예금주명"으로 찾으면 같은 단어가 든 안내문 두 줄에도
 * 걸려서, 이름이 정확히 같은 요소를 찾는다.
 */
const holderName = (page: Page, name: string) =>
  page.getByText(name, { exact: true })

const newTransferButton = (page: Page) =>
  page.getByRole("button", { name: "새 이체하기" })

test.beforeEach(async ({ page }) => {
  await login(page)
})

test("타행 계좌를 확인하고 보내면 완료되고, 은행이 확인 표에 보인다", async ({
  page,
}) => {
  await confirmPayee(page, OTHER_BANK, INTERBANK.OK)
  await expect(holderName(page, "박*준")).toBeVisible()

  await page.locator("#it-amount").fill("30000")
  await page.getByRole("button", { name: "다음" }).click()
  await expect(page.getByText(OTHER_BANK).first()).toBeVisible()
  await page.getByRole("button", { name: "이체하기" }).click()
  await expect(page.getByRole("dialog")).toContainText(OTHER_BANK)
  await page.getByRole("dialog").getByRole("button", { name: "확인" }).click()

  const otp = page.getByRole("dialog")
  await otp.getByRole("button", { name: "OTP 발급" }).click()
  const issued = otp.getByLabel("발급된 OTP 번호")
  await expect(issued).toHaveText(/^\d{6}$/)
  await otp.getByLabel("OTP 입력").fill((await issued.textContent()) ?? "")
  await otp.getByRole("button", { name: "확인" }).click()

  await expect(page.getByText("이체가 완료되었습니다.")).toBeVisible()
  await expect(page.getByText(`${OTHER_BANK} ${INTERBANK.OK}`)).toBeVisible()
  await expect(newTransferButton(page)).toBeVisible()
  // 타행 계좌는 자주 쓰는 계좌로 등록할 수 없다(서버 인계 문서 §8).
  await expect(
    page.getByRole("button", { name: /자주 쓰는 계좌/ }),
  ).toHaveCount(0)
})

// 결과 화면에 넘기는 처리상태가 어긋나면 이 장면만 잡는다 — 단위 테스트는 부모가
// 자식에 상태를 넘기는 줄을 지나지 않는다(#184 리뷰 R3).
test("타행 TIMEOUT 이면 결과 확인 중 안내가 뜨고 새 이체를 열지 않는다", async ({
  page,
}) => {
  await confirmPayee(page, OTHER_BANK, INTERBANK.TIMEOUT)
  await expect(holderName(page, "박*준")).toBeVisible()
  await transfer(page, 30_000)

  await expect(page.getByText("이체 결과를 확인하는 중입니다.")).toBeVisible()
  await expect(
    page.getByText("상대 은행의 응답이 늦어 결과를 확인하고 있습니다."),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "이체결과조회" })).toBeVisible()
  await expect(newTransferButton(page)).toHaveCount(0)
})

// 타행은 보낸 뒤 실패하면 출금을 되돌린다 — "거래내역이 변동하지 않는다"는 당행 안내를
// 쓰면 거짓이 된다(서버 #658, 인계 문서 §5-1).
test("타행 실패면 오류코드와 출금 되돌림 안내를 보여준다", async ({ page }) => {
  await confirmPayee(page, OTHER_BANK, INTERBANK.NOT_PROCESSED)
  await expect(holderName(page, "박*준")).toBeVisible()
  await transfer(page, 30_000)

  await expect(page.getByText("이체가 처리되지 않았습니다.")).toBeVisible()
  await expect(
    page.getByText("오류코드 TRF0308", { exact: false }),
  ).toBeVisible()
  await expect(
    page.getByText(
      "출금된 금액이 있으면 되돌려지므로 잔액은 이체 전과 같습니다.",
      {
        exact: false,
      },
    ),
  ).toBeVisible()
  await expect(
    page.getByText("잔액과 거래내역이 변동하지 않습니다", { exact: false }),
  ).toHaveCount(0)
})

// REQ-TRSF-004 · corebank-server#680: 실패는 구분된 문구로 안내하고 다음 단계를 막는다.
for (const [label, accountNo, message] of [
  ["계좌 없음", INTERBANK.NOT_FOUND, "입금계좌를 찾을 수 없습니다."],
  [
    "정지·해지",
    INTERBANK.SUSPENDED,
    "거래정지 또는 해지 상태의 입금계좌입니다.",
  ],
  [
    "상대 은행 무응답",
    INTERBANK.UNCONFIRMED,
    "상대 은행에서 예금주를 확인하지 못했습니다.",
  ],
] as const) {
  test(`타행 계좌확인 실패(${label})면 서버 문구를 띄우고 [다음]을 막는다`, async ({
    page,
  }) => {
    await confirmPayee(page, OTHER_BANK, accountNo)
    await page.locator("#it-amount").fill("30000")

    await expect(
      page.getByRole("alert").filter({ hasText: message }),
    ).toBeVisible()
    await expect(page.getByRole("button", { name: "다음" })).toBeDisabled()
  })
}

test("은행을 바꾸면 앞서 확인한 예금주를 지우고 다시 확인하게 한다", async ({
  page,
}) => {
  await confirmPayee(page, OTHER_BANK, INTERBANK.OK)
  await page.locator("#it-amount").fill("30000")
  await expect(page.getByRole("button", { name: "다음" })).toBeEnabled()

  await page.locator("#it-bank").selectOption({ label: "우리은행" })

  await expect(holderName(page, "박*준")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "다음" })).toBeDisabled()
})

// 조회 중에 은행을 바꾸면 늦게 온 응답이 바뀐 은행을 "확인됨"으로 덮으면 안 된다 —
// 그대로 두면 확인하지 않은 은행·계좌로 [다음]이 열린다.
test("계좌확인 응답이 오기 전에 은행을 바꾸면 늦은 응답을 반영하지 않는다", async ({
  page,
}) => {
  await page.goto("/instant-transfer")
  await page.locator("#it-bank").selectOption({ label: OTHER_BANK })
  await fillAccountPassword(page)
  await page.locator("#it-amount").fill("30000")
  // 목은 이 번호에 1초 늦게 답한다 — 은행을 바꾸는 조작이 응답보다 먼저 끝난다.
  await page.locator("#it-to").fill(INTERBANK.SLOW)

  const lateResponse = page.waitForResponse("**/transfers/interbank/payee**")
  await page.getByRole("button", { name: "계좌확인" }).click()
  await page.locator("#it-bank").selectOption({ label: "우리은행" })
  await (await lateResponse).finished()
  // 응답을 받은 뒤 화면이 그 결과를 반영할 때까지 기다린다(JSON 해석 → setState → 렌더).
  // 반영하지 않는 것이 기대값이라 바뀐 DOM 을 기다릴 수 없어서, 작업 큐를 두 번 비운다.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        setTimeout(
          () => requestAnimationFrame(() => setTimeout(resolve, 0)),
          0,
        ),
      ),
  )

  await expect(holderName(page, "박*준")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "다음" })).toBeDisabled()
})

test("당행 이체는 지금처럼 완료되고 자주 쓰는 계좌로 등록할 수 있다", async ({
  page,
}) => {
  await confirmPayee(page, OWN_BANK, "333330730135")
  await expect(holderName(page, "김*수")).toBeVisible()
  await transfer(page, 30_000)

  await expect(page.getByText("이체가 완료되었습니다.")).toBeVisible()
  await expect(newTransferButton(page)).toBeVisible()
  await expect(
    page.getByRole("button", { name: "자주 쓰는 계좌로 등록" }),
  ).toBeVisible()
})
