import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
import { MOCK_WITHDRAWAL_ACCOUNTS } from "@/entities/account"
import { MOCK_MEMBERS } from "@/entities/auth"
import { server } from "@/mocks/server"
import { consumeAccountPasswordToken } from "@/mocks/handlers/account-password-api"
import {
  MOCK_ACCOUNT_ITEMS,
  MOCK_ACCOUNT_OWNER_ID,
} from "@/mocks/handlers/accounts-api"
import { consumeOtpAuthToken } from "@/mocks/handlers/otp-api"

/**
 * MSW 목의 실패 경로. 목은 서버 규칙을 옮긴 것이라(corebank-server origin/dev,
 * 2026-09-11) 잠금·만료·거래 불일치를 여기서 고정한다 — 규칙을 바꿀 사람이 이 목만
 * 고치고 서버와 어긋나도 e2e 는 성공 경로만 밟아 알아채지 못한다.
 *
 * 핸들러에 실제 요청을 보내 확인한다(src/mocks/server.ts). 세션은 auth 목과 같은
 * sessionStorage 키로 넣는다.
 */
const BASE = "http://localhost/api/v1"
const SESSION_KEY = "corebank-mock-session"
/** 계좌 픽스처의 소유자와, 계좌가 없는 다른 회원. 값은 픽스처에서 읽는다. */
const MEMBER_ID = MOCK_ACCOUNT_OWNER_ID!
const OTHER_MEMBER_ID = MOCK_MEMBERS.find(
  (m) => m.memberId !== MEMBER_ID,
)!.memberId

type Envelope = { code: string; message: string; data: Record<string, unknown> }

const call = async (
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<{ status: number; body: Envelope }> => {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  })
  return { status: response.status, body: (await response.json()) as Envelope }
}

/** 시계를 앞으로 돌린다. 목은 만료를 Date.now() 로 판정하고, 응답 지연은 setTimeout 이라 영향이 없다. */
const advanceMs = (ms: number) => {
  const now = Date.now()
  vi.spyOn(Date, "now").mockReturnValue(now + ms)
}

/** 비밀번호가 있는 첫 출금계좌. 값은 픽스처에서 읽고 여기 다시 적지 않는다. */
const WITHDRAWAL = (() => {
  const entry = MOCK_ACCOUNT_ITEMS.find((e) =>
    MOCK_WITHDRAWAL_ACCOUNTS.some((w) => w.accountNo === e.account.accountNo),
  )!
  const password = MOCK_WITHDRAWAL_ACCOUNTS.find(
    (w) => w.accountNo === entry.account.accountNo,
  )!.mockPassword
  return {
    accountId: entry.item.accountId!,
    balance: entry.item.balance!,
    password,
  }
})()

const wrongPassword = (password: string) =>
  password === "0000" ? "9999" : "0000"

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterAll(() => server.close())
beforeEach(() => {
  sessionStorage.clear()
  sessionStorage.setItem(SESSION_KEY, MEMBER_ID)
})
afterEach(() => vi.restoreAllMocks())

describe("계좌비밀번호 검증 목 — 서버 AccountPasswordVerificationService", () => {
  const verify = (accountId: number, accountPassword: string) =>
    call("POST", `/accounts/${accountId}/password/verify`, { accountPassword })

  it("불일치는 APW0001(400)이고 data 에 누적 횟수를 싣는다", async () => {
    const { status, body } = await verify(
      WITHDRAWAL.accountId,
      wrongPassword(WITHDRAWAL.password),
    )
    expect(status).toBe(400)
    expect(body.code).toBe("APW0001")
    expect(body.data).toMatchObject({ errorCount: 1, remainingAttempts: 4 })
  })

  it("5회째 불일치는 APW0101(403) 잠금이고, 잠긴 뒤에는 맞는 비밀번호도 거부한다", async () => {
    const wrong = wrongPassword(WITHDRAWAL.password)
    for (let i = 1; i <= 4; i++) {
      expect((await verify(WITHDRAWAL.accountId, wrong)).body.code).toBe(
        "APW0001",
      )
    }
    const fifth = await verify(WITHDRAWAL.accountId, wrong)
    expect(fifth.status).toBe(403)
    expect(fifth.body.code).toBe("APW0101")
    expect(fifth.body.data).toMatchObject({
      errorCount: 5,
      remainingAttempts: 0,
    })

    const afterLock = await verify(WITHDRAWAL.accountId, WITHDRAWAL.password)
    expect(afterLock.body.code).toBe("APW0101")
  })

  it("성공하면 누적이 비워지고, 토큰은 그 계좌에서 한 번만 쓸 수 있다", async () => {
    await verify(WITHDRAWAL.accountId, wrongPassword(WITHDRAWAL.password))
    const { body } = await verify(WITHDRAWAL.accountId, WITHDRAWAL.password)
    expect(body.data).toMatchObject({ errorCount: 0, remainingAttempts: 5 })

    const token = String(body.data.accountPasswordAuthToken)
    const otherAccountId = WITHDRAWAL.accountId + 1
    expect(consumeAccountPasswordToken(token, MEMBER_ID, otherAccountId)).toBe(
      "INVALID",
    )
    expect(
      consumeAccountPasswordToken(token, MEMBER_ID, WITHDRAWAL.accountId),
    ).toBe("OK")
    expect(
      consumeAccountPasswordToken(token, MEMBER_ID, WITHDRAWAL.accountId),
    ).toBe("INVALID")
  })

  it("인증 토큰은 5분 뒤 만료된다", async () => {
    const { body } = await verify(WITHDRAWAL.accountId, WITHDRAWAL.password)
    advanceMs(5 * 60 * 1000 + 1000)
    expect(
      consumeAccountPasswordToken(
        String(body.data.accountPasswordAuthToken),
        MEMBER_ID,
        WITHDRAWAL.accountId,
      ),
    ).toBe("INVALID")
  })

  it("비밀번호 픽스처가 없는 계좌(예적금)는 ACC0201(404)이다", async () => {
    const deposit = MOCK_ACCOUNT_ITEMS.find(
      (e) => e.account.group === "deposit",
    )!
    const { status, body } = await verify(deposit.item.accountId!, "1234")
    expect(status).toBe(404)
    expect(body.code).toBe("ACC0201")
  })

  it("로그인하지 않으면 401 CMN0101 이다", async () => {
    sessionStorage.clear()
    const { status, body } = await verify(
      WITHDRAWAL.accountId,
      WITHDRAWAL.password,
    )
    expect(status).toBe(401)
    expect(body.code).toBe("CMN0101")
  })

  it("소유자가 아니면 ACC0201(404)이고, 소유자의 오류 횟수를 쌓지 않는다", async () => {
    sessionStorage.setItem(SESSION_KEY, OTHER_MEMBER_ID)
    const denied = await verify(
      WITHDRAWAL.accountId,
      wrongPassword(WITHDRAWAL.password),
    )
    expect(denied.status).toBe(404)
    expect(denied.body.code).toBe("ACC0201")

    // 남의 계좌를 잠글 수 있으면 안 된다 — 소유자의 첫 오류가 1회째여야 한다.
    sessionStorage.setItem(SESSION_KEY, MEMBER_ID)
    const own = await verify(
      WITHDRAWAL.accountId,
      wrongPassword(WITHDRAWAL.password),
    )
    expect(own.body.data).toMatchObject({ errorCount: 1 })
  })
})

describe("계좌 개요 목 — GET /accounts", () => {
  it("로그인하지 않으면 401 CMN0101 이다(실서버와 같다)", async () => {
    sessionStorage.clear()
    const { status, body } = await call("GET", "/accounts")
    expect(status).toBe(401)
    expect(body.code).toBe("CMN0101")
  })

  it("소유자가 아닌 회원에게는 계좌가 없다", async () => {
    sessionStorage.setItem(SESSION_KEY, OTHER_MEMBER_ID)
    const { body } = await call("GET", "/accounts")
    const groups = body.data.items as { accounts: unknown[] }[]
    expect(groups.flatMap((g) => g.accounts)).toHaveLength(0)
    expect(body.data.totalAssets).toBe(0)
  })
})

describe("OTP 목 — 서버 OtpErrorCode·OtpProperties", () => {
  const TRANSACTION = {
    productId: 1,
    subscriptionAmount: 1_000_000,
    termMonths: 12,
    withdrawalAccountId: WITHDRAWAL.accountId,
  }
  const issue = (transactionData: Record<string, unknown> = TRANSACTION) =>
    call("POST", "/otp/issue", {
      transactionType: "PRODUCT_SUBSCRIPTION",
      transactionData,
    })
  const verify = (otpRequestId: unknown, otpCode: string) =>
    call("POST", "/otp/verify", { otpRequestId, otpCode })
  const wrongCode = (code: string) => (code === "000000" ? "111111" : "000000")

  it("발급 응답에 6자리 번호와 유효시간 180초를 싣는다", async () => {
    const { body } = await issue()
    expect(String(body.data.otpCode)).toMatch(/^\d{6}$/)
    expect(body.data.expiresIn).toBe(180)
  })

  it("틀리면 OTP0001(400)과 누적 횟수, 5회째는 OTP0103(403)이고 이후 맞는 번호도 거부한다", async () => {
    const { data } = (await issue()).body
    const wrong = wrongCode(String(data.otpCode))

    const first = await verify(data.otpRequestId, wrong)
    expect(first.status).toBe(400)
    expect(first.body.code).toBe("OTP0001")
    expect(first.body.data).toMatchObject({
      errorCount: 1,
      remainingAttempts: 4,
    })

    for (let i = 2; i <= 4; i++) await verify(data.otpRequestId, wrong)
    const fifth = await verify(data.otpRequestId, wrong)
    expect(fifth.status).toBe(403)
    expect(fifth.body.code).toBe("OTP0103")

    const afterLock = await verify(data.otpRequestId, String(data.otpCode))
    expect(afterLock.body.code).toBe("OTP0103")
  })

  it("3분이 지나면 OTP0104(403) 만료다", async () => {
    const { data } = (await issue()).body
    advanceMs(3 * 60 * 1000 + 1000)
    const { status, body } = await verify(
      data.otpRequestId,
      String(data.otpCode),
    )
    expect(status).toBe(403)
    expect(body.code).toBe("OTP0104")
  })

  it("검증에 성공한 요청은 소비돼, 다시 검증하면 OTP0201(404)이다", async () => {
    const { data } = (await issue()).body
    expect((await verify(data.otpRequestId, String(data.otpCode))).status).toBe(
      200,
    )
    const again = await verify(data.otpRequestId, String(data.otpCode))
    expect(again.status).toBe(404)
    expect(again.body.code).toBe("OTP0201")
  })

  it("인증 토큰은 거래유형·거래정보가 같을 때 한 번만 쓸 수 있다", async () => {
    const { data } = (await issue()).body
    const token = String(
      (await verify(data.otpRequestId, String(data.otpCode))).body.data
        .otpAuthToken,
    )

    expect(
      consumeOtpAuthToken(token, MEMBER_ID, "PRODUCT_SUBSCRIPTION", {
        ...TRANSACTION,
        subscriptionAmount: TRANSACTION.subscriptionAmount + 1_000,
      }),
    ).toBe("MISMATCH")
    expect(
      consumeOtpAuthToken(
        token,
        MEMBER_ID,
        "ACCOUNT_PASSWORD_CHANGE",
        TRANSACTION,
      ),
    ).toBe("MISMATCH")
    expect(
      consumeOtpAuthToken(
        token,
        MEMBER_ID,
        "PRODUCT_SUBSCRIPTION",
        TRANSACTION,
      ),
    ).toBe("OK")
    expect(
      consumeOtpAuthToken(
        token,
        MEMBER_ID,
        "PRODUCT_SUBSCRIPTION",
        TRANSACTION,
      ),
    ).toBe("INVALID")
  })

  it("인증 토큰은 5분 뒤 만료된다", async () => {
    const { data } = (await issue()).body
    const token = String(
      (await verify(data.otpRequestId, String(data.otpCode))).body.data
        .otpAuthToken,
    )
    advanceMs(5 * 60 * 1000 + 1000)
    expect(
      consumeOtpAuthToken(
        token,
        MEMBER_ID,
        "PRODUCT_SUBSCRIPTION",
        TRANSACTION,
      ),
    ).toBe("INVALID")
  })
})

describe("상품가입 목 — 서버 ProductSubscriptionValidation·ExecuteService", () => {
  const AGREED = [
    { termsId: 1, version: "1.0" },
    { termsId: 2, version: "1.0" },
  ]
  const viewRequiredTerms = async (productId: number) => {
    for (const { termsId } of AGREED) {
      await call("GET", `/products/${productId}/terms/${termsId}`)
    }
  }
  const validate = (body: Record<string, unknown>) =>
    call("POST", "/product-subscriptions/validation", body)
  const DEPOSIT = {
    productId: 1,
    subscriptionAmount: 1_000_000,
    termMonths: 12,
    withdrawalAccountId: WITHDRAWAL.accountId,
    agreedTerms: AGREED,
  }
  const violationCodes = (body: Envelope) =>
    ((body.data.violations as { code: string }[]) ?? []).map((v) => v.code)

  it("전문을 열람하지 않고 동의하면 PRD0005 이고, reason 에 약관 ID 를 붙인다", async () => {
    const { body } = await validate(DEPOSIT)
    expect(body.data.valid).toBe(false)
    expect(violationCodes(body)).toContain("PRD0005")
    const reasons = (body.data.violations as { reason: string }[]).map(
      (v) => v.reason,
    )
    expect(reasons).toContain(
      "약관 전문을 확인한 후 동의해 주세요. (termsId=1)",
    )
  })

  it("열람 기록은 30분 뒤 사라져 다시 PRD0005 가 된다", async () => {
    await viewRequiredTerms(1)
    expect((await validate(DEPOSIT)).body.data.valid).toBe(true)

    advanceMs(30 * 60 * 1000 + 1000)
    expect(violationCodes((await validate(DEPOSIT)).body)).toContain("PRD0005")
  })

  it("정기예금은 출금계좌 잔액을 넘으면 LMT0001, 적금은 잔액을 보지 않는다", async () => {
    await viewRequiredTerms(1)
    await viewRequiredTerms(2)
    const overBalance = Math.ceil((WITHDRAWAL.balance + 1) / 1_000) * 1_000

    const deposit = await validate({
      ...DEPOSIT,
      subscriptionAmount: overBalance,
    })
    expect(violationCodes(deposit.body)).toContain("LMT0001")

    const savings = await validate({
      ...DEPOSIT,
      productId: 2,
      // 적금 한도 안에서 잔액을 넘는 월 납입액이 없으면 이 단언은 의미가 없다.
      subscriptionAmount: Math.min(overBalance, 3_000_000),
    })
    expect(violationCodes(savings.body)).not.toContain("LMT0001")
  })

  it("agreedTerms 가 없으면 400 CMN0001, 빈 배열은 정상 요청이다", async () => {
    // 서버 DTO 가 @NotNull 이라 없는 필드는 본문 검증 오류다. 빈 배열은 통과해
    // 필수 약관 미동의(PRD0003) 위반으로 나온다.
    const missing = await validate({ ...DEPOSIT, agreedTerms: undefined })
    expect(missing.status).toBe(400)
    expect(missing.body.code).toBe("CMN0001")

    const empty = await validate({ ...DEPOSIT, agreedTerms: [] })
    expect(empty.status).toBe(200)
    expect(violationCodes(empty.body)).toContain("PRD0003")

    const execute = await call("POST", "/product-subscriptions", {
      ...DEPOSIT,
      agreedTerms: undefined,
      newAccountPassword: "1357",
      newAccountPasswordConfirm: "1357",
      accountPasswordAuthToken: "unused",
      otpAuthToken: "unused",
    })
    expect(execute.status).toBe(400)
    expect(execute.body.code).toBe("CMN0001")
  })

  it("소유자가 아닌 회원은 그 계좌를 출금계좌로 쓸 수 없다(ACC0201)", async () => {
    sessionStorage.setItem(SESSION_KEY, OTHER_MEMBER_ID)
    const { status, body } = await validate(DEPOSIT)
    expect(status).toBe(404)
    expect(body.code).toBe("ACC0201")
  })

  it("상품에 없는 약관으로 동의하면 위반이 아니라 즉시 PRD0202(404)다", async () => {
    const { status, body } = await validate({
      ...DEPOSIT,
      agreedTerms: [{ termsId: 999, version: "1.0" }],
    })
    expect(status).toBe(404)
    expect(body.code).toBe("PRD0202")
  })

  it("실행은 검증의 첫 위반을 400 으로 던진다", async () => {
    const { status, body } = await call("POST", "/product-subscriptions", {
      ...DEPOSIT,
      newAccountPassword: "1357",
      newAccountPasswordConfirm: "1357",
      accountPasswordAuthToken: "unused",
      otpAuthToken: "unused",
    })
    expect(status).toBe(400)
    expect(body.code).toBe("PRD0005")
  })

  it("실행은 OTP 가 다른 금액으로 발급됐으면 OTP0102(403)로 거부한다", async () => {
    await viewRequiredTerms(1)
    const password = await call(
      "POST",
      `/accounts/${WITHDRAWAL.accountId}/password/verify`,
      { accountPassword: WITHDRAWAL.password },
    )
    const issued = (
      await call("POST", "/otp/issue", {
        transactionType: "PRODUCT_SUBSCRIPTION",
        transactionData: {
          productId: DEPOSIT.productId,
          subscriptionAmount: DEPOSIT.subscriptionAmount + 1_000,
          termMonths: DEPOSIT.termMonths,
          withdrawalAccountId: DEPOSIT.withdrawalAccountId,
        },
      })
    ).body.data
    const otp = await call("POST", "/otp/verify", {
      otpRequestId: issued.otpRequestId,
      otpCode: issued.otpCode,
    })

    const { status, body } = await call("POST", "/product-subscriptions", {
      ...DEPOSIT,
      newAccountPassword: "1357",
      newAccountPasswordConfirm: "1357",
      accountPasswordAuthToken: password.body.data.accountPasswordAuthToken,
      otpAuthToken: otp.body.data.otpAuthToken,
    })
    expect(status).toBe(403)
    expect(body.code).toBe("OTP0102")
    // OTP 가 거부되면 계좌를 열지 않는다 — 가입 내역이 없다.
    const result = await call("GET", "/product-subscriptions/1")
    expect(result.status).toBe(404)
    expect(result.body.code).toBe("PRD0203")

    // 계좌비밀번호 토큰은 OTP 확인 전에 소비된다. 서버도 같은 순서라
    // (ProductSubscriptionExecuteService: 비밀번호 토큰 소비 → OTP 확인), OTP 가
    // 실패하면 비밀번호 인증부터 다시 받아야 한다.
    expect(
      consumeAccountPasswordToken(
        String(password.body.data.accountPasswordAuthToken),
        MEMBER_ID,
        WITHDRAWAL.accountId,
      ),
    ).toBe("INVALID")
  })
})
