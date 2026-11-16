import { expect, test, type Page } from "@playwright/test"

/**
 * 예·적금 만기해지·중도해지 B-02 → 예상 지급액 → 인증·해지 → 완료. 서버 역할은 MSW 목이 한다
 * (src/mocks/handlers/deposit-termination-api.ts). 만기해지는 만기가 지난 "만기도래 정기예금"
 * 픽스처로, 중도해지는 만기 전 계좌로 밟는다.
 */
const CUSTOMER = { userId: "honggildong", password: "Passw0rd!" }
const DEPOSIT_PASSWORD = "1234"
const WRONG_PASSWORD = "0000"
const TARGET_ACCOUNT = "정기예금 1년"
const MATURED_ACCOUNT = "만기도래 정기예금"

async function login(page: Page) {
  await page.goto("/")
  await page.getByLabel("이용자ID").fill(CUSTOMER.userId)
  await page.getByLabel("비밀번호").fill(CUSTOMER.password)
  await page.getByRole("button", { name: "로그인" }).click()
  await page.waitForURL("**/dashboard")
}

async function fillAccountPassword(page: Page, password: string) {
  for (let i = 0; i < password.length; i++) {
    await page.getByLabel(`계좌비밀번호 ${i + 1}번째 자리`).fill(password[i])
  }
}

const targetRow = (page: Page) =>
  page.getByRole("row", { name: new RegExp(TARGET_ACCOUNT) })

const maturedRow = (page: Page) =>
  page.getByRole("row", { name: new RegExp(MATURED_ACCOUNT) })

async function openEarlyTermination(page: Page) {
  await page.goto("/accounts/deposits")
  await targetRow(page).getByRole("button", { name: "중도해지" }).click()
  await expect(page.getByText("예상 지급액", { exact: true })).toBeVisible()
}

async function terminateEarly(page: Page) {
  await openEarlyTermination(page)
  await page.getByLabel(/중도해지이율 적용과 해지 후 복구할 수 없음/).check()
  await page.getByRole("button", { name: "다음" }).click()
  await fillAccountPassword(page, DEPOSIT_PASSWORD)
  await page.getByRole("button", { name: "중도해지하기" }).click()
  await expect(page.getByText("중도해지가 완료되었습니다.")).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await login(page)
})

test("만기 전 계좌는 목록에서 D-n 과 [중도해지]가 보인다", async ({ page }) => {
  await page.goto("/accounts/deposits")

  await expect(targetRow(page).getByText(/D-\d+/)).toBeVisible()
  await expect(
    targetRow(page).getByRole("button", { name: "중도해지" }),
  ).toBeVisible()
})

test("유의사항을 확인해야 다음으로 갈 수 있다", async ({ page }) => {
  await openEarlyTermination(page)

  const next = page.getByRole("button", { name: "다음" })
  await expect(next).toBeDisabled()

  await page.getByLabel(/중도해지이율 적용과 해지 후 복구할 수 없음/).check()
  await expect(next).toBeEnabled()
})

test("비밀번호가 틀리면 해지되지 않고, 맞으면 완료 화면과 목록 반영까지 간다", async ({
  page,
}) => {
  await openEarlyTermination(page)
  await page.getByLabel(/중도해지이율 적용과 해지 후 복구할 수 없음/).check()
  await page.getByRole("button", { name: "다음" }).click()

  await fillAccountPassword(page, WRONG_PASSWORD)
  await page.getByRole("button", { name: "중도해지하기" }).click()
  await expect(page.getByRole("alert")).toContainText(
    "계좌비밀번호가 일치하지 않습니다.",
  )
  await expect(page.getByText("중도해지가 완료되었습니다.")).toHaveCount(0)

  await fillAccountPassword(page, DEPOSIT_PASSWORD)
  await page.getByRole("button", { name: "중도해지하기" }).click()

  await expect(page.getByText("중도해지가 완료되었습니다.")).toBeVisible()
  await expect(page.getByText("실제 지급액")).toBeVisible()

  await page.getByRole("button", { name: "예·적금 계좌목록" }).click()
  await expect(page.getByText("내집마련적금")).toBeVisible()
  await expect(targetRow(page)).toHaveCount(0)
})

test("2단계를 직접 열면 처음부터 다시 진행하도록 안내한다", async ({
  page,
}) => {
  await openEarlyTermination(page)
  const step1Url = page.url()

  await page.goto(step1Url.replace(/\/1$/, "/2"))

  await expect(page.getByText("해지 정보를 확인할 수 없습니다.")).toBeVisible()
})

test("해지 뒤 뒤로 가기로 인증 단계가 다시 열리지 않는다", async ({ page }) => {
  await terminateEarly(page)

  await page.goBack()

  await expect(
    page.getByText("중도해지 예상 지급액을 불러오지 못했습니다."),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "중도해지하기" })).toHaveCount(
    0,
  )
})

test("만기 도래 계좌는 [만기해지]로 주의 확인 없이 완료까지 간다", async ({
  page,
}) => {
  await page.goto("/accounts/deposits")
  await expect(maturedRow(page).getByText("만기 도달")).toBeVisible()
  await maturedRow(page).getByRole("button", { name: "만기해지" }).click()
  await expect(page.getByText("예상 지급액", { exact: true })).toBeVisible()

  await page.getByRole("button", { name: "다음" }).click()
  await fillAccountPassword(page, DEPOSIT_PASSWORD)
  await page.getByRole("button", { name: "만기해지하기" }).click()

  await expect(page.getByText("만기해지가 완료되었습니다.")).toBeVisible()
  await page.getByRole("button", { name: "예·적금 계좌목록" }).click()
  await expect(maturedRow(page)).toHaveCount(0)
})

test("계좌 개요를 못 받으면 해지 계좌를 확인할 때까지 다음으로 가지 못한다", async ({
  page,
}) => {
  await page.evaluate(() =>
    sessionStorage.setItem(
      "corebank-mock:accounts:overview-unavailable",
      "true",
    ),
  )

  await page.goto("/accounts/deposits/6/termination/early/1")

  await expect(
    page.getByText("해지 계좌 정보를 확인하지 못했습니다."),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "다음" })).toHaveCount(0)

  await page.evaluate(() =>
    sessionStorage.removeItem("corebank-mock:accounts:overview-unavailable"),
  )
  await page.getByRole("button", { name: "다시 시도" }).click()

  await expect(page.getByRole("button", { name: "다음" })).toBeVisible()
})

test("처리 중(CMN0301) 응답 뒤 재시도는 같은 멱등키를 쓰고, 서버가 거절하면 새 키를 쓴다", async ({
  page,
}) => {
  const idempotencyKeys: string[] = []
  page.on("request", (request) => {
    if (/\/accounts\/\d+\/early-termination$/.test(request.url())) {
      idempotencyKeys.push(request.headers()["idempotency-key"])
    }
  })
  await page.evaluate(() =>
    sessionStorage.setItem(
      "corebank-mock:termination:injected-errors",
      JSON.stringify([
        { code: "CMN0301", status: 409 },
        { code: "ACC0301", status: 409 },
      ]),
    ),
  )

  await openEarlyTermination(page)
  await page.getByLabel(/중도해지이율 적용과 해지 후 복구할 수 없음/).check()
  await page.getByRole("button", { name: "다음" }).click()

  const submit = async () => {
    await fillAccountPassword(page, DEPOSIT_PASSWORD)
    await page.getByRole("button", { name: "중도해지하기" }).click()
  }
  const closeDialog = () =>
    page.getByRole("dialog").getByRole("button", { name: "확인" }).click()

  await submit() // CMN0301: 처리 중
  await expect(page.getByRole("dialog")).toContainText("처리 중")
  await closeDialog()

  await submit() // 같은 키로 재시도 -> ACC0301: 서버가 거절
  await expect(page.getByRole("dialog")).toContainText("중도해지 실패")
  await closeDialog()

  await submit() // 새 키로 재시도 -> 통과
  await expect(page.getByText("중도해지가 완료되었습니다.")).toBeVisible()

  expect(idempotencyKeys).toHaveLength(3)
  expect(idempotencyKeys[1]).toBe(idempotencyKeys[0])
  expect(idempotencyKeys[2]).not.toBe(idempotencyKeys[1])
})

test("서버 오류(5xx)는 실패로 단정하지 않고 결과 확인을 안내하며 같은 멱등키로 다시 보낸다", async ({
  page,
}) => {
  const idempotencyKeys: string[] = []
  page.on("request", (request) => {
    if (/\/accounts\/\d+\/early-termination$/.test(request.url())) {
      idempotencyKeys.push(request.headers()["idempotency-key"])
    }
  })
  await page.evaluate(() =>
    sessionStorage.setItem(
      "corebank-mock:termination:injected-errors",
      JSON.stringify([{ code: "CMN9999", status: 500 }]),
    ),
  )

  await openEarlyTermination(page)
  await page.getByLabel(/중도해지이율 적용과 해지 후 복구할 수 없음/).check()
  await page.getByRole("button", { name: "다음" }).click()

  await fillAccountPassword(page, DEPOSIT_PASSWORD)
  await page.getByRole("button", { name: "중도해지하기" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toContainText("결과 확인 필요")
  await expect(dialog).toContainText("거래내역")
  await expect(dialog).not.toContainText("중도해지 실패")
  await dialog.getByRole("button", { name: "확인" }).click()

  await fillAccountPassword(page, DEPOSIT_PASSWORD)
  await page.getByRole("button", { name: "중도해지하기" }).click()
  await expect(page.getByText("중도해지가 완료되었습니다.")).toBeVisible()

  expect(idempotencyKeys).toHaveLength(2)
  expect(idempotencyKeys[1]).toBe(idempotencyKeys[0])
})

test("결과 미확정 뒤 이전 단계로 갔다 돌아와도 같은 멱등키로 다시 보낸다", async ({
  page,
}) => {
  const idempotencyKeys: string[] = []
  page.on("request", (request) => {
    if (/\/accounts\/\d+\/early-termination$/.test(request.url())) {
      idempotencyKeys.push(request.headers()["idempotency-key"])
    }
  })
  await page.evaluate(() =>
    sessionStorage.setItem(
      "corebank-mock:termination:injected-errors",
      JSON.stringify([{ code: "CMN9999", status: 500 }]),
    ),
  )

  await openEarlyTermination(page)
  await page.getByLabel(/중도해지이율 적용과 해지 후 복구할 수 없음/).check()
  await page.getByRole("button", { name: "다음" }).click()
  await fillAccountPassword(page, DEPOSIT_PASSWORD)
  await page.getByRole("button", { name: "중도해지하기" }).click()
  await expect(page.getByRole("dialog")).toContainText("결과 확인 필요")
  await page.getByRole("dialog").getByRole("button", { name: "확인" }).click()

  // 2단계 화면이 사라졌다 다시 만들어져도 키는 이어진다.
  await page.getByRole("button", { name: "이전" }).click()
  await page.getByLabel(/중도해지이율 적용과 해지 후 복구할 수 없음/).check()
  await page.getByRole("button", { name: "다음" }).click()
  await fillAccountPassword(page, DEPOSIT_PASSWORD)
  await page.getByRole("button", { name: "중도해지하기" }).click()
  await expect(page.getByText("중도해지가 완료되었습니다.")).toBeVisible()

  expect(idempotencyKeys).toHaveLength(2)
  expect(idempotencyKeys[1]).toBe(idempotencyKeys[0])
})

test("게이트웨이 시간 초과(408)는 거절로 단정하지 않고 같은 멱등키로 다시 보낸다", async ({
  page,
}) => {
  const idempotencyKeys: string[] = []
  page.on("request", (request) => {
    if (/\/accounts\/\d+\/early-termination$/.test(request.url())) {
      idempotencyKeys.push(request.headers()["idempotency-key"])
    }
  })
  await page.evaluate(() =>
    sessionStorage.setItem(
      "corebank-mock:termination:injected-errors",
      JSON.stringify([{ code: "CMN9000", status: 408 }]),
    ),
  )

  await openEarlyTermination(page)
  await page.getByLabel(/중도해지이율 적용과 해지 후 복구할 수 없음/).check()
  await page.getByRole("button", { name: "다음" }).click()
  await fillAccountPassword(page, DEPOSIT_PASSWORD)
  await page.getByRole("button", { name: "중도해지하기" }).click()
  await expect(page.getByRole("dialog")).toContainText("결과 확인 필요")
  await page.getByRole("dialog").getByRole("button", { name: "확인" }).click()

  await fillAccountPassword(page, DEPOSIT_PASSWORD)
  await page.getByRole("button", { name: "중도해지하기" }).click()
  await expect(page.getByText("중도해지가 완료되었습니다.")).toBeVisible()

  expect(idempotencyKeys).toHaveLength(2)
  expect(idempotencyKeys[1]).toBe(idempotencyKeys[0])
})
