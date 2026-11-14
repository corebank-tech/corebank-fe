import { delay, http } from "msw"
import type {
  EarlyTerminationResponse,
  TerminationPreviewResponse,
} from "@/shared/api/generated"
import { getToday } from "@/shared/config/clock"
import { daysBetween } from "@/shared/lib/date"
import {
  findMockAccount,
  MOCK_ACCOUNT_ITEMS,
} from "@/mocks/handlers/accounts-api"
import {
  ACCOUNT_PASSWORD_ERROR,
  consumeAccountPasswordToken,
} from "@/mocks/handlers/account-password-api"
import { readSignedInMemberId, unauthorized } from "@/mocks/handlers/auth"
import { fail, ok } from "@/mocks/lib/envelope"
import { readStore, toLocalDateTime, writeStore } from "@/mocks/lib/mock-store"
import {
  markAccountTerminated,
  readTerminatedAccountIds,
} from "@/mocks/lib/terminated-accounts"

const MOCK_LATENCY_MS = 200
const REPLAYS_KEY = "deposit-termination-replays"
/** 이자 세율(이자소득세 14% + 지방소득세 1.4%). */
const INTEREST_TAX_RATE = 0.154
const MATURITY_ANNUAL_RATE = 0.03
const EARLY_ANNUAL_RATE = 0.01

type TerminationKind = "maturity" | "early"

type TerminationReplay = {
  accountId: number
  kind: TerminationKind
  response: EarlyTerminationResponse
}

type TerminationQuote = Required<
  Pick<
    TerminationPreviewResponse,
    "principal" | "grossInterest" | "tax" | "netInterest"
  >
> & { totalAmount: number }

/**
 * 예·적금 만기해지·중도해지 MSW 목 — 예상 조회와 실행.
 *
 * 서버 규칙을 따른다. 만기해지는 만기일이 지난(MATURED) 계좌만, 중도해지는 만기 전
 * ACTIVE 계좌만 받고, 실행은 멱등키와 계좌비밀번호 인증 토큰이 모두 있어야 한다.
 * 같은 멱등키로 다시 보내면 최초 성공 응답을 그대로 돌려준다. 수취 계좌는 입출금
 * 첫 계좌로 고정한다.
 *
 * 계좌 픽스처에는 만기가 지난 계좌가 없어서 만기해지는 이 목으로 화면까지 가지 못한다.
 */
const quoteTermination = (
  kind: TerminationKind,
  balance: number,
  openedDate: string,
  maturityDate: string,
): TerminationQuote => {
  const interestEndDate = kind === "maturity" ? maturityDate : getToday()
  const elapsedDays = Math.max(daysBetween(openedDate, interestEndDate), 0)
  const annualRate =
    kind === "maturity" ? MATURITY_ANNUAL_RATE : EARLY_ANNUAL_RATE
  const grossInterest = Math.floor((balance * annualRate * elapsedDays) / 365)
  const tax = Math.floor(grossInterest * INTEREST_TAX_RATE)
  const netInterest = grossInterest - tax

  return {
    principal: balance,
    grossInterest,
    tax,
    netInterest,
    totalAmount: balance + netInterest,
  }
}

const findWithdrawalAccountId = () =>
  MOCK_ACCOUNT_ITEMS.find((entry) => entry.account.group === "checking")?.item
    .accountId

type TerminationTarget = {
  accountId: number
  balance: number
  openedDate: string
  maturityDate: string
}

/** 해지 대상 계좌를 찾고, 해지 유형과 맞지 않으면 서버와 같은 오류 응답을 준다. */
const resolveTarget = (
  kind: TerminationKind,
  accountId: number,
  memberId: string,
): { target: TerminationTarget } | { error: Response } => {
  const entry = findMockAccount(accountId, memberId)
  if (entry == null || readTerminatedAccountIds().includes(accountId)) {
    return {
      error: fail("ACC0201", "계좌를 찾을 수 없거나 소유권이 없습니다.", 404),
    }
  }

  const { item } = entry
  if (item.accountType !== "TIME_DEPOSIT" || item.maturityDate == null) {
    return {
      error: fail("ACC0305", "해지를 지원하지 않는 계좌입니다.", 409),
    }
  }

  const isMatured = daysBetween(getToday(), item.maturityDate) <= 0
  if (kind === "maturity" && !isMatured) {
    return { error: fail("ACC0306", "실제 만기일이 도래하지 않았습니다.", 409) }
  }
  if (kind === "early" && isMatured) {
    return {
      error: fail("ACC0301", "계좌 상태가 해지 가능한 상태가 아닙니다.", 409),
    }
  }

  return {
    target: {
      accountId,
      balance: item.balance ?? 0,
      openedDate: item.openedDate ?? getToday(),
      maturityDate: item.maturityDate,
    },
  }
}

const previewHandler = (kind: TerminationKind) =>
  http.get(
    `*/accounts/:accountId/${kind === "maturity" ? "maturity" : "early"}-termination/preview`,
    async ({ params }) => {
      await delay(MOCK_LATENCY_MS)

      const memberId = readSignedInMemberId()
      if (memberId == null) return unauthorized()

      const resolved = resolveTarget(kind, Number(params.accountId), memberId)
      if ("error" in resolved) return resolved.error
      const { target } = resolved

      const quote = quoteTermination(
        kind,
        target.balance,
        target.openedDate,
        target.maturityDate,
      )
      const preview: TerminationPreviewResponse = {
        accountId: target.accountId,
        terminationType: kind === "maturity" ? "MATURITY" : "EARLY_TERMINATION",
        withdrawalAccountId: findWithdrawalAccountId(),
        principal: quote.principal,
        grossInterest: quote.grossInterest,
        tax: quote.tax,
        netInterest: quote.netInterest,
        totalExpectedAmount: quote.totalAmount,
        calculationDate: getToday(),
        calculatedAt: toLocalDateTime(new Date()),
      }

      return ok(preview)
    },
  )

const executeHandler = (kind: TerminationKind) =>
  http.post(
    `*/accounts/:accountId/${kind === "maturity" ? "maturity" : "early"}-termination`,
    async ({ params, request }) => {
      await delay(MOCK_LATENCY_MS)

      const memberId = readSignedInMemberId()
      if (memberId == null) return unauthorized()

      const idempotencyKey = request.headers.get("Idempotency-Key")
      const authToken = request.headers.get("Account-Password-Auth-Token")
      if (!idempotencyKey || !authToken) {
        return fail(
          "CMN0002",
          "Idempotency-Key 또는 Account-Password-Auth-Token 헤더가 없습니다.",
          400,
        )
      }

      const accountId = Number(params.accountId)
      const replays = readStore<Record<string, TerminationReplay>>(
        REPLAYS_KEY,
        {},
      )
      const replayed = replays[idempotencyKey]
      if (replayed != null) {
        // 같은 키에 다른 요청을 실으면 서버가 거부한다.
        return replayed.accountId === accountId && replayed.kind === kind
          ? ok(replayed.response)
          : fail("CMN0302", "같은 멱등키에 다른 요청을 보낼 수 없습니다.", 409)
      }

      const resolved = resolveTarget(kind, accountId, memberId)
      if ("error" in resolved) return resolved.error
      const { target } = resolved

      const passwordResult = consumeAccountPasswordToken(
        authToken,
        memberId,
        accountId,
      )
      if (passwordResult === "LOCKED") {
        return fail(...ACCOUNT_PASSWORD_ERROR.LOCKED)
      }
      if (passwordResult === "INVALID") {
        return fail(...ACCOUNT_PASSWORD_ERROR.INVALID_AUTH_TOKEN)
      }

      const quote = quoteTermination(
        kind,
        target.balance,
        target.openedDate,
        target.maturityDate,
      )
      const result: EarlyTerminationResponse = {
        accountId,
        withdrawalAccountId: findWithdrawalAccountId(),
        principal: quote.principal,
        grossInterest: quote.grossInterest,
        tax: quote.tax,
        netInterest: quote.netInterest,
        totalTransferred: quote.totalAmount,
        transactionNumber: `TRM${String(Date.now()).slice(-9)}`,
        tradeDate: getToday(),
        closedAt: toLocalDateTime(new Date()),
      }

      markAccountTerminated(accountId)
      writeStore(REPLAYS_KEY, {
        ...replays,
        [idempotencyKey]: { accountId, kind, response: result },
      })

      return ok(result)
    },
  )

export const depositTerminationApiHandlers = [
  previewHandler("maturity"),
  previewHandler("early"),
  executeHandler("maturity"),
  executeHandler("early"),
]
