import { delay, http } from "msw"
import type { IssueOtpRequest, VerifyOtpRequest } from "@/shared/api/generated"
import { readSignedInMemberId, unauthorized } from "@/mocks/handlers/auth"
import { fail, failWithData, ok } from "@/mocks/lib/envelope"
import { readStore, writeStore } from "@/mocks/lib/mock-store"

const MOCK_LATENCY_MS = 200

/**
 * OTP 발급·검증 MSW 목. OtpModal 을 실거래 모드로 쓰는 화면(이체·예약·자동이체·
 * 한도·계좌비밀번호·출금계좌·상품가입) 전부가 이 두 엔드포인트를 쓴다.
 *
 * 수치는 서버 설정을 따른다 — application.yml `app.otp.code-ttl: 3m`,
 * `auth-token-ttl: 5m`, `expose-code: true`(Phase 1 Mock OTP 라 번호를 응답에 싣는다),
 * `OtpVerificationRequest.MAX_ATTEMPTS = 5`.
 */
const CODE_TTL_MS = 3 * 60 * 1000
const AUTH_TOKEN_TTL_MS = 5 * 60 * 1000
const MAX_ATTEMPTS = 5

/** 서버 OtpErrorCode 원본. */
const OTP_ERROR = {
  CODE_MISMATCH: ["OTP0001", "OTP 번호가 일치하지 않습니다.", 400],
  INVALID_AUTH_TOKEN: ["OTP0101", "OTP 인증 토큰이 유효하지 않습니다.", 403],
  TRANSACTION_MISMATCH: [
    "OTP0102",
    "인증한 거래 내용과 요청 내용이 일치하지 않습니다.",
    403,
  ],
  ATTEMPTS_EXCEEDED: [
    "OTP0103",
    "OTP 오류 횟수(5회)를 초과하여 잠금 처리되었습니다. OTP를 재발급받아 주세요.",
    403,
  ],
  EXPIRED: ["OTP0104", "OTP가 만료되었습니다. 재발급받아 주세요.", 403],
  REQUEST_NOT_FOUND: ["OTP0201", "OTP 요청을 찾을 수 없습니다.", 404],
} as const

type OtpErrorKey = keyof typeof OTP_ERROR

export const otpError = (key: OtpErrorKey) => {
  const [code, message, status] = OTP_ERROR[key]
  return fail(code, message, status)
}

type TransactionBinding = {
  memberId: string
  transactionType: string
  transactionData: Record<string, unknown>
}

type OtpRequestRecord = TransactionBinding & {
  otpCode: string
  expiresAt: number
  errorCount: number
}

type OtpTokenRecord = TransactionBinding & { expiresAt: number }

const REQUESTS_KEY = "otp-requests"
const TOKENS_KEY = "otp-tokens"

const generateCode = (): string =>
  String(Math.floor(100000 + Math.random() * 900000))

export type OtpConsumeResult = "OK" | "INVALID" | "MISMATCH"

/**
 * 업무 API 가 OTP 인증 토큰을 한 번 소비한다(서버 `OtpAuthTokenVerifier.verifyAndConsume`).
 *
 * 발급 때 결합한 거래정보를 `expected` 의 필드별로 대조한다. 서버도 거래유형별로
 * 재구성한 항목만 대조하므로(상품가입은 productId·subscriptionAmount·termMonths·
 * withdrawalAccountId 네 개) 호출자는 대조할 필드만 넘긴다. 성공했을 때만 소비한다.
 */
export const consumeOtpAuthToken = (
  token: string,
  memberId: string,
  transactionType: string,
  expected: Record<string, unknown>,
): OtpConsumeResult => {
  const tokens = readStore<Record<string, OtpTokenRecord>>(TOKENS_KEY, {})
  const record = tokens[token]
  if (
    record == null ||
    record.memberId !== memberId ||
    record.expiresAt <= Date.now()
  ) {
    return "INVALID"
  }

  const matches =
    record.transactionType === transactionType &&
    Object.entries(expected).every(
      ([key, value]) => String(record.transactionData[key]) === String(value),
    )
  if (!matches) return "MISMATCH"

  delete tokens[token]
  writeStore(TOKENS_KEY, tokens)
  return "OK"
}

export const otpApiHandlers = [
  http.post("*/otp/issue", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)

    const memberId = readSignedInMemberId()
    if (memberId == null) return unauthorized()

    const body = (await request.json()) as IssueOtpRequest
    const otpRequestId = crypto.randomUUID()
    const otpCode = generateCode()

    const requests = readStore<Record<string, OtpRequestRecord>>(
      REQUESTS_KEY,
      {},
    )
    requests[otpRequestId] = {
      memberId,
      transactionType: body.transactionType,
      transactionData: body.transactionData,
      otpCode,
      expiresAt: Date.now() + CODE_TTL_MS,
      errorCount: 0,
    }
    writeStore(REQUESTS_KEY, requests)

    return ok({ otpRequestId, otpCode, expiresIn: CODE_TTL_MS / 1000 })
  }),

  http.post("*/otp/verify", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)

    const memberId = readSignedInMemberId()
    if (memberId == null) return unauthorized()

    const { otpRequestId, otpCode } = (await request.json()) as VerifyOtpRequest
    const requests = readStore<Record<string, OtpRequestRecord>>(
      REQUESTS_KEY,
      {},
    )
    const record = requests[otpRequestId]

    if (record == null || record.memberId !== memberId) {
      return otpError("REQUEST_NOT_FOUND")
    }
    if (record.errorCount >= MAX_ATTEMPTS) return otpError("ATTEMPTS_EXCEEDED")
    if (record.expiresAt <= Date.now()) return otpError("EXPIRED")

    if (record.otpCode !== otpCode) {
      record.errorCount += 1
      writeStore(REQUESTS_KEY, requests)
      if (record.errorCount >= MAX_ATTEMPTS)
        return otpError("ATTEMPTS_EXCEEDED")
      // 실패 응답에도 누적 횟수를 싣는다(VerifyOtpResponse 의 errorCount·remainingAttempts 는
      // "성공 응답에서는 null").
      const [code, message, status] = OTP_ERROR.CODE_MISMATCH
      return failWithData(code, message, status, {
        otpAuthToken: null,
        errorCount: record.errorCount,
        remainingAttempts: MAX_ATTEMPTS - record.errorCount,
      })
    }

    // 검증에 성공한 요청은 소비된다 — 같은 otpRequestId 로 다시 검증하면 OTP0201 이다.
    delete requests[otpRequestId]
    writeStore(REQUESTS_KEY, requests)

    const otpAuthToken = crypto.randomUUID()
    const tokens = readStore<Record<string, OtpTokenRecord>>(TOKENS_KEY, {})
    tokens[otpAuthToken] = {
      memberId,
      transactionType: record.transactionType,
      transactionData: record.transactionData,
      expiresAt: Date.now() + AUTH_TOKEN_TTL_MS,
    }
    writeStore(TOKENS_KEY, tokens)

    return ok({ otpAuthToken, errorCount: null, remainingAttempts: null })
  }),
]
