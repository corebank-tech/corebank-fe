import { delay, http } from "msw"
import { MOCK_WITHDRAWAL_ACCOUNTS } from "@/entities/account"
import type { AccountPasswordVerifyRequest } from "@/shared/api/generated"
import { findMockAccount } from "@/mocks/handlers/accounts-api"
import { readSignedInMemberId, unauthorized } from "@/mocks/handlers/auth"
import { fail, failWithData, ok } from "@/mocks/lib/envelope"
import { readStore, writeStore } from "@/mocks/lib/mock-store"

const MOCK_LATENCY_MS = 200

/**
 * 계좌비밀번호 검증 MSW 목. 즉시이체(D-01)·계좌비밀번호 변경(B-04)·출금계좌관리(B-05)·
 * 상품가입(C-05)이 같은 엔드포인트를 쓴다.
 *
 * 규칙은 서버 `AccountPasswordVerificationService` 를 따른다.
 * - 불일치는 200 이 아니라 APW0001(400) 오류이고, 5회째 불일치는 APW0101(403) 잠금이다.
 *   두 실패 응답 모두 data 에 누적 횟수를 싣는다(`AccountPasswordFailureData`).
 * - 성공하면 5분짜리 일회용 인증 토큰을 준다(`app.account.password.auth-token-ttl: 5m`).
 *
 * 비밀번호는 출금계좌 픽스처(`MOCK_WITHDRAWAL_ACCOUNTS.mockPassword`)에서 계좌번호로 찾는다.
 */
const MAX_ATTEMPTS = 5
const AUTH_TOKEN_TTL_MS = 5 * 60 * 1000

/** 계좌 ID → 누적 오류 횟수. */
const ERROR_COUNTS_KEY = "account-password-errors"
const TOKENS_KEY = "account-password-tokens"

type TokenRecord = { memberId: string; accountId: number; expiresAt: number }

const passwordOf = (accountNo: string) =>
  MOCK_WITHDRAWAL_ACCOUNTS.find((account) => account.accountNo === accountNo)
    ?.mockPassword

const readErrorCount = (accountId: number): number =>
  readStore<Record<string, number>>(ERROR_COUNTS_KEY, {})[accountId] ?? 0

const writeErrorCount = (accountId: number, count: number) => {
  const counts = readStore<Record<string, number>>(ERROR_COUNTS_KEY, {})
  counts[accountId] = count
  writeStore(ERROR_COUNTS_KEY, counts)
}

/** 서버 AccountPasswordErrorCode 원본. */
export const ACCOUNT_PASSWORD_ERROR = {
  MISMATCH: ["APW0001", "계좌비밀번호가 일치하지 않습니다.", 400],
  NEW_PASSWORD_CONFIRM_MISMATCH: [
    "APW0002",
    "신규 비밀번호와 확인값이 일치하지 않습니다.",
    400,
  ],
  LOCKED: ["APW0101", "계좌비밀번호 5회 오류로 거래가 정지되었습니다.", 403],
  INVALID_AUTH_TOKEN: [
    "APW0102",
    "계좌비밀번호 인증 토큰이 유효하지 않습니다.",
    403,
  ],
} as const

export type AccountPasswordTokenResult = "OK" | "INVALID" | "LOCKED"

/**
 * 업무 API 가 계좌비밀번호 인증 토큰을 한 번 소비한다(서버
 * `AccountPasswordAuthTokenService.verifyAndConsume`). 잠긴 계좌는 토큰이 맞아도 막는다.
 */
export const consumeAccountPasswordToken = (
  token: string,
  memberId: string,
  accountId: number,
): AccountPasswordTokenResult => {
  if (readErrorCount(accountId) >= MAX_ATTEMPTS) return "LOCKED"

  const tokens = readStore<Record<string, TokenRecord>>(TOKENS_KEY, {})
  const record = tokens[token]
  if (
    record == null ||
    record.memberId !== memberId ||
    record.accountId !== accountId ||
    record.expiresAt <= Date.now()
  ) {
    return "INVALID"
  }

  delete tokens[token]
  writeStore(TOKENS_KEY, tokens)
  return "OK"
}

export const accountPasswordApiHandlers = [
  http.post(
    "*/accounts/:accountId/password/verify",
    async ({ params, request }) => {
      await delay(MOCK_LATENCY_MS)

      const memberId = readSignedInMemberId()
      if (memberId == null) return unauthorized()

      const accountId = Number(params.accountId)
      const entry = findMockAccount(accountId)
      const expected = entry && passwordOf(entry.account.accountNo)
      // 비밀번호 픽스처가 없는 계좌(예적금)는 검증 대상이 아니다. 서버의
      // ACCOUNT_NOT_FOUND_OR_FORBIDDEN 과 같은 응답으로 떨어뜨린다.
      if (entry == null || expected == null) {
        return fail("ACC0201", "계좌를 찾을 수 없거나 접근할 수 없습니다.", 404)
      }

      const failure = (
        [code, message, status]: readonly [string, string, number],
        errorCount: number,
      ) =>
        failWithData(code, message, status, {
          accountId,
          isMatched: false,
          accountPasswordAuthToken: null,
          errorCount,
          remainingAttempts: Math.max(0, MAX_ATTEMPTS - errorCount),
        })

      const current = readErrorCount(accountId)
      if (current >= MAX_ATTEMPTS) {
        return failure(ACCOUNT_PASSWORD_ERROR.LOCKED, current)
      }

      const { accountPassword } =
        (await request.json()) as AccountPasswordVerifyRequest
      if (accountPassword !== expected) {
        const next = current + 1
        writeErrorCount(accountId, next)
        return failure(
          next >= MAX_ATTEMPTS
            ? ACCOUNT_PASSWORD_ERROR.LOCKED
            : ACCOUNT_PASSWORD_ERROR.MISMATCH,
          next,
        )
      }

      // 성공 응답이 errorCount 0·remainingAttempts 5 로 오므로(서버 결과 생성자) 누적을 비운다.
      writeErrorCount(accountId, 0)

      const accountPasswordAuthToken = crypto.randomUUID()
      const tokens = readStore<Record<string, TokenRecord>>(TOKENS_KEY, {})
      tokens[accountPasswordAuthToken] = {
        memberId,
        accountId,
        expiresAt: Date.now() + AUTH_TOKEN_TTL_MS,
      }
      writeStore(TOKENS_KEY, tokens)

      return ok({
        accountId,
        isMatched: true,
        accountPasswordAuthToken,
        errorCount: 0,
        remainingAttempts: MAX_ATTEMPTS,
      })
    },
  ),
]
