import { delay, http } from "msw"
import { addMonthsWithEomCorrection } from "@/entities/product"
import type {
  ProductSubscriptionExecuteRequest,
  ProductSubscriptionExecuteResponse,
  ProductSubscriptionResultResponse,
  ProductSubscriptionValidationRequest,
  ProductSubscriptionValidationResponse,
  ViolationItem,
} from "@/shared/api/generated"
import { getNow, getToday } from "@/shared/config/clock"
import {
  ACCOUNT_PASSWORD_ERROR,
  consumeAccountPasswordToken,
} from "@/mocks/handlers/account-password-api"
import { findMockAccount } from "@/mocks/handlers/accounts-api"
import { readSignedInMemberId, unauthorized } from "@/mocks/handlers/auth"
import { consumeOtpAuthToken, otpError } from "@/mocks/handlers/otp-api"
import {
  buildProductDetail,
  findProduct,
  isTermsViewed,
} from "@/mocks/handlers/products-api"
import { fail, ok } from "@/mocks/lib/envelope"
import { nextSequence, readStore, writeStore } from "@/mocks/lib/mock-store"

const MOCK_LATENCY_MS = 200

/**
 * 상품가입 검증(C-04)·실행(C-05)·결과 조회(C-06) MSW 목.
 *
 * 규칙은 서버 구현을 옮겼다(corebank-server origin/dev, 2026-09-11 기준).
 * - 검증 `ProductSubscriptionValidationService`: 위반은 200 + violations 로 모아 돌려주고,
 *   상품·출금계좌·약관 ID 가 없으면 즉시 오류다.
 * - 실행 `ProductSubscriptionExecuteService`: 같은 검증을 다시 돌려 첫 위반을 400 으로 던지고,
 *   계좌비밀번호·OTP 인증 토큰을 한 번씩 소비한 뒤 계좌를 연다.
 * - 결과 `ProductSubscriptionResultResponse`: 자동이체 프리필은 적금·성공 건에만 붙는다.
 *
 * 상품·약관·계좌 값은 다른 목(products-api·accounts-api)에서 읽고 여기 다시 적지 않는다.
 *
 * 한계: 정기예금 초입금으로 출금계좌 잔액이 줄고 새 계좌가 생기지만, 계좌 개요 목은 정본
 * 픽스처를 그대로 그려 가입 후 B-01 에는 반영되지 않는다.
 */

/** 서버 SubscriptionViolationCode 원본. 코드와 문구가 서버와 1:1 이다. */
const VIOLATION = {
  PRODUCT_NOT_ON_SALE: ["PRD0007", "판매중인 상품이 아닙니다."],
  AMOUNT_OUT_OF_RANGE: ["PRD0001", "가입금액이 상품 한도 범위를 벗어났습니다."],
  AMOUNT_UNIT_MISMATCH: [
    "PRD0004",
    "가입금액이 상품의 입력 단위에 맞지 않습니다.",
  ],
  TERM_NOT_ALLOWED: ["PRD0002", "가입기간이 상품 허용 범위를 벗어났습니다."],
  INSUFFICIENT_BALANCE: ["LMT0001", "출금가능금액이 부족합니다."],
  REQUIRED_TERMS_NOT_AGREED: ["PRD0003", "필수 약관에 동의하지 않았습니다."],
  TERMS_NOT_VIEWED: ["PRD0005", "약관 전문을 확인한 후 동의해 주세요."],
  TERMS_VERSION_MISMATCH: [
    "PRD0006",
    "약관이 변경되었습니다. 다시 확인해 주세요.",
  ],
} as const

/**
 * 서버 `SubscriptionViolation.of` 와 같다 — 약관 위반처럼 대상이 여럿인 항목은
 * reason 에 `문구 (termsId=N)` 로 대상을 붙인다.
 */
const violationOf = (
  field: string,
  key: keyof typeof VIOLATION,
  detail?: string,
): ViolationItem => ({
  field,
  code: VIOLATION[key][0],
  reason:
    detail == null ? VIOLATION[key][1] : `${VIOLATION[key][1]} (${detail})`,
})

/** 서버 MaskingUtil.maskAccountNumber — 12자리 중 앞 3자리 + ****** + 끝 3자리. */
export const maskAccountNumber = (accountNumber: string): string =>
  `${accountNumber.slice(0, 3)}******${accountNumber.slice(9, 12)}`

/**
 * 신규 계좌번호 = 은행코드(088) + 상품 접두 2자리 + 일련번호 7자리(서버 AccountNumberPolicy·
 * AccountNumberSequence). 접두는 서버 시드(R__seed_master_data.sql)에서 이름이 가장 가까운
 * 상품의 값을 따랐다 — PRD_CORE_DEP 21, PRD_FREE_SAVE 31, PRD_REGULAR_SAVE 32.
 */
export const ACCOUNT_PREFIX_BY_PRODUCT_ID: Record<number, string> = {
  1: "21",
  2: "31",
  3: "32",
}

const BANK_CODE = "088"

const roundRate = (rate: number): number => Math.round(rate * 100) / 100

/**
 * 서버 `SubscriptionMaturityCalculator` 이식. 정기예금은 거치식 단리, 정기적금은 월 적립식
 * 단리(가중 개월수 n(n+1)/2)이고 이자는 원 단위 절사(RoundingMode.DOWN)다.
 *
 * 금리를 베이시스포인트 정수로 바꿔 계산한다 — 부동소수로 곱하면 3.35% 같은 값에서
 * 절사 경계가 1원씩 흔들린다(3.35 * 100 = 334.99999999999994).
 */
export const calculateMaturity = (
  productGroup: string | undefined,
  amount: number,
  termMonths: number,
  appliedRate: number,
) => {
  const rateBp = Math.round(appliedRate * 100)

  if (productGroup === "SAVINGS") {
    const principal = amount * termMonths
    const weightedMonths = (termMonths * (termMonths + 1)) / 2
    const interest = Math.floor((amount * rateBp * weightedMonths) / 120_000)
    return {
      expectedPrincipal: principal,
      expectedInterest: interest,
      expectedMaturityAmount: principal + interest,
    }
  }

  const interest = Math.floor((amount * rateBp * termMonths) / 120_000)
  return {
    expectedPrincipal: amount,
    expectedInterest: interest,
    expectedMaturityAmount: amount + interest,
  }
}

type ValidationInput = Pick<
  ProductSubscriptionValidationRequest,
  | "productId"
  | "subscriptionAmount"
  | "termMonths"
  | "withdrawalAccountId"
  | "agreedTerms"
  | "satisfiedConditionCodes"
>

type Validation =
  | { ok: false; response: ReturnType<typeof fail> }
  | {
      ok: true
      body: ProductSubscriptionValidationResponse
      violations: ViolationItem[]
    }

const validate = (memberId: string, input: ValidationInput): Validation => {
  const product = findProduct(input.productId)
  if (!product) {
    return {
      ok: false,
      response: fail("PRD0201", "상품을 찾을 수 없습니다.", 404),
    }
  }
  const detail = buildProductDetail(product)

  const entry = findMockAccount(input.withdrawalAccountId, memberId)
  if (entry == null || entry.item.transferEnabled !== true) {
    return {
      ok: false,
      response: fail(
        "ACC0201",
        "계좌를 찾을 수 없거나 접근할 수 없습니다.",
        404,
      ),
    }
  }

  const { subscriptionAmount: amount, termMonths } = input
  const violations: ViolationItem[] = []

  if (detail.saleStatus !== "ON_SALE") {
    violations.push(violationOf("productId", "PRODUCT_NOT_ON_SALE"))
  }
  if (amount < (detail.minAmount ?? 0) || amount > (detail.maxAmount ?? 0)) {
    violations.push(violationOf("subscriptionAmount", "AMOUNT_OUT_OF_RANGE"))
  }
  const amountUnit = detail.amountUnit ?? 0
  if (amountUnit > 0 && amount % amountUnit !== 0) {
    violations.push(violationOf("subscriptionAmount", "AMOUNT_UNIT_MISMATCH"))
  }
  const tier = (detail.rateTiers ?? []).find((t) => t.termMonths === termMonths)
  if (tier == null) {
    violations.push(violationOf("termMonths", "TERM_NOT_ALLOWED"))
  }

  // 잔액은 목돈을 한 번에 넣는 정기예금만 본다. 적금은 가입 시점에 옮길 자금이 없다.
  const checkBalance = detail.productGroup === "DEPOSIT"
  const balance = entry.item.balance ?? 0
  if (checkBalance && balance < amount) {
    violations.push(violationOf("withdrawalAccountId", "INSUFFICIENT_BALANCE"))
  }

  // 이 상품에 없는 약관으로 동의를 보내면 위반 누적이 아니라 즉시 오류다(서버와 같다 —
  // 그냥 통과시키면 동의 이력 저장 시점에야 실패한다).
  const productTerms = detail.terms ?? []
  const termIds = new Set(productTerms.map((t) => t.termsId))
  if (input.agreedTerms.some((agreed) => !termIds.has(agreed.termsId))) {
    return {
      ok: false,
      response: fail("PRD0202", "약관을 찾을 수 없습니다.", 404),
    }
  }
  const agreedVersion = new Map(
    input.agreedTerms.map((agreed) => [agreed.termsId, agreed.version]),
  )
  for (const term of productTerms) {
    if (!term.required) continue
    const version = agreedVersion.get(term.termsId ?? 0)
    if (version == null) {
      violations.push(
        violationOf(
          "agreedTerms",
          "REQUIRED_TERMS_NOT_AGREED",
          `termsId=${term.termsId}`,
        ),
      )
      continue
    }
    if (term.viewRequired && !isTermsViewed(memberId, term.termsId ?? 0)) {
      violations.push(
        violationOf(
          "agreedTerms",
          "TERMS_NOT_VIEWED",
          `termsId=${term.termsId}`,
        ),
      )
    }
    if (version !== term.version) {
      violations.push(
        violationOf(
          "agreedTerms",
          "TERMS_VERSION_MISMATCH",
          `termsId=${term.termsId}`,
        ),
      )
    }
  }

  const base: ProductSubscriptionValidationResponse = {
    productGroup: detail.productGroup,
    withdrawalAccountNumber: maskAccountNumber(entry.account.accountNo),
    withdrawalAccountBalance: checkBalance ? balance : undefined,
  }

  if (violations.length > 0 || tier == null) {
    return {
      ok: true,
      violations,
      body: { ...base, valid: false, violations },
    }
  }

  const baseRate = tier.rate ?? 0
  // 조건 충족 여부는 클라이언트 신고값을 믿고, 이 상품에 정의된 조건만 합산한다.
  const satisfied = new Set(input.satisfiedConditionCodes ?? [])
  const preferentialRate = roundRate(
    (detail.preferentialRates ?? [])
      .filter((item) => satisfied.has(item.conditionCode ?? ""))
      .reduce((sum, item) => sum + (item.rate ?? 0), 0),
  )
  const appliedRate = roundRate(baseRate + preferentialRate)

  return {
    ok: true,
    violations: [],
    body: {
      ...base,
      valid: true,
      violations: [],
      baseRate,
      preferentialRate,
      appliedRate,
      // 서버는 LocalDate.plusMonths — 없는 날짜는 그 달 말일로 접는다. 같은 규칙이다.
      maturityDate: addMonthsWithEomCorrection(getToday(), termMonths),
      ...calculateMaturity(
        detail.productGroup,
        amount,
        termMonths,
        appliedRate,
      ),
    },
  }
}

type StoredSubscription = {
  subscriptionId: number
  memberId: string
  productId: number
  accountId: number
  /** 원본 계좌번호. 응답에는 마스킹해서 내보내고 자동이체 프리필에만 원본을 싣는다. */
  accountNumber: string
  withdrawalAccountId: number
  subscriptionAmount: number
  termMonths: number
  appliedRate: number
  openedDate: string
  maturityDate: string
  expectedMaturityAmount: number
  status: "SUCCESS"
  transactionNumber: string | null
  subscribedAt: string
}

const SUBSCRIPTIONS_KEY = "product-subscriptions"

/** 정본 계좌(1~n)와 겹치지 않게 신규 계좌 ID 는 1000 번대에서 준다. */
const NEW_ACCOUNT_ID_BASE = 1000

/**
 * 서버 요청 DTO 는 `agreedTerms` 가 `@NotNull` 이라, 필드가 없으면 본문 검증 단계에서
 * 400 CMN0001(INVALID_INPUT)이다. 빈 배열은 "아직 동의 전 상태로 미리 검증"하는 정상
 * 요청이라 통과시킨다 — 없는 필드를 빈 배열로 바꾸면 서버와 결과가 달라진다.
 */
const hasAgreedTerms = (body: { agreedTerms?: unknown }) =>
  Array.isArray(body.agreedTerms)

const invalidInput = () => fail("CMN0001", "입력값이 올바르지 않습니다.", 400)

export const productSubscriptionsApiHandlers = [
  http.post("*/product-subscriptions/validation", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)

    const memberId = readSignedInMemberId()
    if (memberId == null) return unauthorized()

    const body = (await request.json()) as ProductSubscriptionValidationRequest
    if (!hasAgreedTerms(body)) return invalidInput()
    const result = validate(memberId, body)
    return result.ok ? ok(result.body) : result.response
  }),

  http.post("*/product-subscriptions", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)

    const memberId = readSignedInMemberId()
    if (memberId == null) return unauthorized()

    const req = (await request.json()) as ProductSubscriptionExecuteRequest
    if (!hasAgreedTerms(req)) return invalidInput()

    // 순서는 서버와 같다 — 토큰을 소비하지 않는 검증을 전부 먼저 끝내고, 일회용 토큰은
    // 계좌 개설 바로 앞에서 소비한다(무관한 검증 실패로 인증을 다시 받게 하지 않으려고).
    if (req.newAccountPassword !== req.newAccountPasswordConfirm) {
      return fail(...ACCOUNT_PASSWORD_ERROR.NEW_PASSWORD_CONFIRM_MISMATCH)
    }

    const product = findProduct(req.productId)
    if (!product) return fail("PRD0201", "상품을 찾을 수 없습니다.", 404)

    // 목 상품은 모두 "1인 1계좌"다(상세 응답 eligibility).
    const subscriptions = readStore<StoredSubscription[]>(SUBSCRIPTIONS_KEY, [])
    if (
      subscriptions.some(
        (s) => s.memberId === memberId && s.productId === req.productId,
      )
    ) {
      return fail("PRD0301", "이미 가입한 상품입니다.", 409)
    }

    // 실행 시점에는 우대금리를 적용하지 않는다 — 서버가 신고값을 믿지 않으려고 빈 목록으로 검증한다.
    const validation = validate(memberId, {
      ...req,
      satisfiedConditionCodes: [],
    })
    if (!validation.ok) return validation.response
    const [first] = validation.violations
    if (first != null) return fail(first.code ?? "", first.reason ?? "", 400)

    const password = consumeAccountPasswordToken(
      req.accountPasswordAuthToken,
      memberId,
      req.withdrawalAccountId,
    )
    if (password === "LOCKED") return fail(...ACCOUNT_PASSWORD_ERROR.LOCKED)
    if (password === "INVALID") {
      return fail(...ACCOUNT_PASSWORD_ERROR.INVALID_AUTH_TOKEN)
    }

    const otp = consumeOtpAuthToken(
      req.otpAuthToken,
      memberId,
      "PRODUCT_SUBSCRIPTION",
      {
        productId: req.productId,
        subscriptionAmount: req.subscriptionAmount,
        termMonths: req.termMonths,
        withdrawalAccountId: req.withdrawalAccountId,
      },
    )
    if (otp === "INVALID") return otpError("INVALID_AUTH_TOKEN")
    if (otp === "MISMATCH") return otpError("TRANSACTION_MISMATCH")

    const checked = validation.body
    const prefix = ACCOUNT_PREFIX_BY_PRODUCT_ID[req.productId]
    const accountNumber = `${BANK_CODE}${prefix}${String(
      nextSequence(`account:${prefix}`),
    ).padStart(7, "0")}`
    const subscriptionId = nextSequence("subscription")
    const today = getToday()

    // 정기예금은 가입 시점에 목돈을 옮기는 초입금 거래가 생긴다. 거래번호 규칙은
    // YYYYMMDD + 채널(WB) + 일련 10자리(서버 SequenceGenerator). 적금은 거래번호가 없다.
    const transactionNumber =
      product.productGroup === "DEPOSIT"
        ? `${today.replaceAll("-", "")}WB${String(
            nextSequence(`transaction:${today}`),
          ).padStart(10, "0")}`
        : null

    const stored: StoredSubscription = {
      subscriptionId,
      memberId,
      productId: req.productId,
      accountId: NEW_ACCOUNT_ID_BASE + subscriptionId,
      accountNumber,
      withdrawalAccountId: req.withdrawalAccountId,
      subscriptionAmount: req.subscriptionAmount,
      termMonths: req.termMonths,
      appliedRate: checked.appliedRate ?? 0,
      openedDate: today,
      maturityDate: checked.maturityDate ?? today,
      expectedMaturityAmount: checked.expectedMaturityAmount ?? 0,
      status: "SUCCESS",
      transactionNumber,
      subscribedAt: getNow(),
    }
    writeStore(SUBSCRIPTIONS_KEY, [...subscriptions, stored])

    const response: ProductSubscriptionExecuteResponse = {
      subscriptionId,
      accountId: stored.accountId,
      accountNumber: maskAccountNumber(accountNumber),
      productName: product.productName,
      productGroup: product.productGroup,
      subscriptionAmount: stored.subscriptionAmount,
      termMonths: stored.termMonths,
      appliedRate: stored.appliedRate,
      openedDate: stored.openedDate,
      maturityDate: stored.maturityDate,
      expectedMaturityAmount: stored.expectedMaturityAmount,
      status: stored.status,
      transactionNumber: stored.transactionNumber ?? undefined,
      subscribedAt: stored.subscribedAt,
    }
    return ok(response)
  }),

  http.get("*/product-subscriptions/:subscriptionId", async ({ params }) => {
    await delay(MOCK_LATENCY_MS)

    const memberId = readSignedInMemberId()
    if (memberId == null) return unauthorized()

    const stored = readStore<StoredSubscription[]>(SUBSCRIPTIONS_KEY, []).find(
      (s) =>
        s.subscriptionId === Number(params.subscriptionId) &&
        s.memberId === memberId,
    )
    if (stored == null) {
      return fail("PRD0203", "가입 내역을 찾을 수 없습니다.", 404)
    }
    const product = findProduct(stored.productId)

    // 서버와 같은 조건 — 적금이고 성공한 가입만 자동이체를 바로 이어 등록할 수 있다.
    // 입금계좌 번호는 마스킹하지 않는다(자동이체 등록 폼에 그대로 채우므로).
    const canCreateAutoTransfer =
      product?.productGroup === "SAVINGS" && stored.status === "SUCCESS"

    const response: ProductSubscriptionResultResponse = {
      subscriptionId: stored.subscriptionId,
      accountId: stored.accountId,
      accountNumber: maskAccountNumber(stored.accountNumber),
      productId: stored.productId,
      productName: product?.productName,
      productGroup: product?.productGroup,
      subscriptionAmount: stored.subscriptionAmount,
      termMonths: stored.termMonths,
      appliedRate: stored.appliedRate,
      openedDate: stored.openedDate,
      maturityDate: stored.maturityDate,
      expectedMaturityAmount: stored.expectedMaturityAmount,
      status: stored.status,
      transactionNumber: stored.transactionNumber ?? undefined,
      subscribedAt: stored.subscribedAt,
      autoTransferPrefill: canCreateAutoTransfer
        ? {
            withdrawalAccountId: stored.withdrawalAccountId,
            depositAccountNumber: stored.accountNumber,
            amount: stored.subscriptionAmount,
            cycleMonths: 1,
            endDate: stored.maturityDate,
          }
        : undefined,
    }
    return ok(response)
  }),
]
