import { delay, http } from "msw"
import type {
  FavoriteAccountResponse,
  InterbankBankResponse,
  InterbankTransferRequest,
  InterbankTransferResponse,
  TransferLimitResponse,
  TransferRequest,
  TransferResponse,
} from "@/shared/api/generated"
import {
  TRANSFER_LIMIT_PER_DAY_DEFAULT,
  TRANSFER_LIMIT_PER_TRANSFER_DEFAULT,
} from "@/shared/config/policy"
import { getNow } from "@/shared/config/clock"
import { findMockAccount } from "@/mocks/handlers/accounts-api"
import {
  ACCOUNT_PASSWORD_ERROR,
  consumeAccountPasswordToken,
} from "@/mocks/handlers/account-password-api"
import { readSignedInMemberId, unauthorized } from "@/mocks/handlers/auth"
import { consumeOtpAuthToken, otpError } from "@/mocks/handlers/otp-api"
import { fail, ok } from "@/mocks/lib/envelope"

const MOCK_LATENCY_MS = 200

/**
 * 즉시이체(D-01~03) MSW 목 — 당행·타행 수취인 조회, 실행, 은행 목록, 이체한도, 자주 쓰는 계좌.
 *
 * 타행 장면은 계좌번호로 고른다(e2e 가 이 표의 번호를 쓴다).
 *
 * | 타행 계좌번호 | 수취인 조회 | 실행 |
 * |---|---|---|
 * | `1234567890001` | `TRF0201` 404 (상대 `1001`) | — |
 * | `1234567890002` | `TRF0301` 409 (상대 `1002`) | — |
 * | `1234567890009` | `TRF0309` 409 (상대 무응답, corebank-server#680) | — |
 * | `1234567890006` | 정상, 1초 늦게 (늦은 응답 장면) | 200 + `SUCCESS` |
 * | `1234567890007` | 정상 | 200 + `ERROR` `TRF0308` |
 * | `1234567890008` | 정상 | 200 + `TIMEOUT` |
 * | 그 밖의 숫자 1~16자리 | 정상 | 200 + `SUCCESS` |
 *
 * 잔액은 저장하지 않는다 — 이체 후 잔액은 실행 시점 픽스처 잔액에서 뺀 값이다.
 */

/** 서버 `TransferErrorCode` 원본. `TRF0309` 는 corebank-server#680 합의. */
const TRANSFER_ERROR = {
  UNSUPPORTED_ACCOUNT_TYPE: [
    "TRF0004",
    "입금계좌로 지정할 수 없는 상품 유형입니다.",
    400,
  ],
  UNSUPPORTED_BANK: ["TRF0006", "지원하지 않는 은행입니다.", 400],
  INVALID_INTERBANK_ACCOUNT_NUMBER: [
    "TRF0007",
    "타행 계좌번호는 숫자 1~16자리여야 합니다.",
    400,
  ],
  PAYEE_NOT_FOUND: ["TRF0201", "입금계좌를 찾을 수 없습니다.", 404],
  PAYEE_ACCOUNT_SUSPENDED: [
    "TRF0301",
    "거래정지 또는 해지 상태의 입금계좌입니다.",
    409,
  ],
  INTERBANK_PAYEE_UNCONFIRMED: [
    "TRF0309",
    "상대 은행에서 예금주를 확인하지 못했습니다.",
    409,
  ],
} as const

const IDEMPOTENCY_CONFLICT = [
  "CMN0302",
  "같은 멱등키로 다른 요청을 보낼 수 없습니다.",
  409,
] as const

/** 서버 `common_code` `BANK_CODE` 시드(corebank-server#656). 당행 088 은 없다. */
const MOCK_BANKS: InterbankBankResponse[] = [
  { bankCode: "004", bankName: "KB국민은행" },
  { bankCode: "011", bankName: "NH농협은행" },
  { bankCode: "020", bankName: "우리은행" },
  { bankCode: "081", bankName: "하나은행" },
  { bankCode: "090", bankName: "카카오뱅크" },
]

/**
 * 당행 입금계좌. 최근 이체계좌 목(`MOCK_RECENT_TRANSFER_ACCOUNTS`)과 같은 번호를 써서 칩을
 * 눌러도 조회가 맞는다. 정지 계좌·정기예금 계좌는 오류 장면이다.
 */
type DomesticPayee =
  | { kind: "OK"; accountId: number; payeeName: string }
  | { kind: "SUSPENDED" }
  | { kind: "TIME_DEPOSIT" }

const DOMESTIC_PAYEES: Record<string, DomesticPayee> = {
  "333330730135": { kind: "OK", accountId: 9001, payeeName: "김*수" },
  "441205567890": { kind: "OK", accountId: 9002, payeeName: "이*연" },
  "219934482201": { kind: "OK", accountId: 9003, payeeName: "오*빈" },
  "333300000002": { kind: "SUSPENDED" },
  "333300000003": { kind: "TIME_DEPOSIT" },
}

const INTERBANK_SCENARIO = {
  NOT_FOUND: "1234567890001",
  SUSPENDED: "1234567890002",
  UNCONFIRMED: "1234567890009",
  SLOW: "1234567890006",
  NOT_PROCESSED: "1234567890007",
  TIMEOUT: "1234567890008",
} as const

const INTERBANK_PAYEE_NAME = "박*준"

/** 늦은 응답 장면에서 응답이 오기 전에 입력을 바꿀 여유. 화면 조작 몇 번이면 끝나는 시간보다 길게 둔다. */
const SLOW_PAYEE_LATENCY_MS = 1000

const isInterbankAccountNumber = (value: string) => /^\d{1,16}$/.test(value)
const isSupportedBank = (bankCode: string | undefined) =>
  MOCK_BANKS.some((bank) => bank.bankCode === bankCode)

/**
 * 멱등키 → 처음 요청 본문과 응답. 같은 키·같은 본문이면 처음 응답을 돌려주고, 본문이
 * 다르면 `CMN0302` 다(서버 api_conventions.md §7-2). 메모리에만 둔다 — 새로고침하면 지워진다.
 */
const replays = new Map<string, { body: string; data: unknown }>()

const replayOrConflict = (key: string | null, body: unknown) => {
  if (key == null) return null
  const seen = replays.get(key)
  if (seen == null) return null
  return seen.body === JSON.stringify(body)
    ? ok(seen.data)
    : fail(...IDEMPOTENCY_CONFLICT)
}

const remember = (key: string | null, body: unknown, data: unknown) => {
  if (key != null) replays.set(key, { body: JSON.stringify(body), data })
}

/**
 * 계좌비밀번호 → OTP 순으로 토큰을 소비한다(서버와 같다). 실패면 오류 응답, 성공이면 `null`.
 * OTP 는 발급 때 결합한 거래정보와 `expected` 를 대조한다(OTP0102).
 */
const consumeTokens = (
  request: Request,
  memberId: string,
  withdrawalAccountId: number,
  expected: Record<string, unknown>,
) => {
  const password = consumeAccountPasswordToken(
    request.headers.get("Account-Password-Auth-Token") ?? "",
    memberId,
    withdrawalAccountId,
  )
  if (password === "LOCKED") return fail(...ACCOUNT_PASSWORD_ERROR.LOCKED)
  if (password === "INVALID") {
    return fail(...ACCOUNT_PASSWORD_ERROR.INVALID_AUTH_TOKEN)
  }

  const otp = consumeOtpAuthToken(
    request.headers.get("Otp-Auth-Token") ?? "",
    memberId,
    "IMMEDIATE_TRANSFER",
    expected,
  )
  if (otp === "INVALID") return otpError("INVALID_AUTH_TOKEN")
  if (otp === "MISMATCH") return otpError("TRANSACTION_MISMATCH")
  return null
}

const balanceAfter = (
  memberId: string,
  withdrawalAccountId: number,
  amount: number,
) =>
  (findMockAccount(withdrawalAccountId, memberId)?.item.balance ?? 0) - amount

export const transferApiHandlers = [
  http.get("*/transfer-limits", async () => {
    await delay(MOCK_LATENCY_MS)
    if (readSignedInMemberId() == null) return unauthorized()
    const limit: TransferLimitResponse = {
      oneTimeLimit: TRANSFER_LIMIT_PER_TRANSFER_DEFAULT,
      dailyLimit: TRANSFER_LIMIT_PER_DAY_DEFAULT,
      dailyUsedAmount: 0,
      dailyRemainingAmount: TRANSFER_LIMIT_PER_DAY_DEFAULT,
    }
    return ok(limit)
  }),

  http.get("*/transfers/favorite-accounts", async () => {
    await delay(MOCK_LATENCY_MS)
    if (readSignedInMemberId() == null) return unauthorized()
    const favorites: FavoriteAccountResponse[] = [
      {
        favoriteAccountId: 1,
        alias: "엄마",
        depositAccountNumber: "441205567890",
        payeeName: "이*연",
        transferable: true,
      },
    ]
    return ok(favorites)
  }),

  http.get("*/transfers/banks", async () => {
    await delay(MOCK_LATENCY_MS)
    if (readSignedInMemberId() == null) return unauthorized()
    return ok(MOCK_BANKS)
  }),

  http.get("*/transfers/payee", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)
    if (readSignedInMemberId() == null) return unauthorized()
    const accountNumber =
      new URL(request.url).searchParams.get("accountNumber") ?? ""
    const payee = DOMESTIC_PAYEES[accountNumber]
    if (payee == null) return fail(...TRANSFER_ERROR.PAYEE_NOT_FOUND)
    if (payee.kind === "SUSPENDED") {
      return fail(...TRANSFER_ERROR.PAYEE_ACCOUNT_SUSPENDED)
    }
    if (payee.kind === "TIME_DEPOSIT") {
      return fail(...TRANSFER_ERROR.UNSUPPORTED_ACCOUNT_TYPE)
    }
    return ok({ accountId: payee.accountId, payeeName: payee.payeeName })
  }),

  http.get("*/transfers/interbank/payee", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)
    if (readSignedInMemberId() == null) return unauthorized()
    const params = new URL(request.url).searchParams
    const accountNumber = params.get("accountNumber") ?? ""
    if (!isSupportedBank(params.get("bankCode") ?? undefined)) {
      return fail(...TRANSFER_ERROR.UNSUPPORTED_BANK)
    }
    if (!isInterbankAccountNumber(accountNumber)) {
      return fail(...TRANSFER_ERROR.INVALID_INTERBANK_ACCOUNT_NUMBER)
    }
    if (accountNumber === INTERBANK_SCENARIO.NOT_FOUND) {
      return fail(...TRANSFER_ERROR.PAYEE_NOT_FOUND)
    }
    if (accountNumber === INTERBANK_SCENARIO.SUSPENDED) {
      return fail(...TRANSFER_ERROR.PAYEE_ACCOUNT_SUSPENDED)
    }
    if (accountNumber === INTERBANK_SCENARIO.UNCONFIRMED) {
      await delay(MOCK_LATENCY_MS)
      return fail(...TRANSFER_ERROR.INTERBANK_PAYEE_UNCONFIRMED)
    }
    if (accountNumber === INTERBANK_SCENARIO.SLOW) {
      await delay(SLOW_PAYEE_LATENCY_MS)
    }
    return ok({ payeeName: INTERBANK_PAYEE_NAME })
  }),

  http.post("*/transfers", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)
    const memberId = readSignedInMemberId()
    if (memberId == null) return unauthorized()

    const req = (await request.json()) as TransferRequest
    const key = request.headers.get("Idempotency-Key")
    const replayed = replayOrConflict(key, req)
    if (replayed) return replayed

    const payee = DOMESTIC_PAYEES[req.depositAccountNumber ?? ""]
    if (payee?.kind !== "OK") return fail(...TRANSFER_ERROR.PAYEE_NOT_FOUND)

    const withdrawalAccountId = req.withdrawalAccountId ?? -1
    const tokenError = consumeTokens(request, memberId, withdrawalAccountId, {
      withdrawalAccountId,
      depositAccountNumber: req.depositAccountNumber,
      amount: req.amount,
    })
    if (tokenError) return tokenError

    const amount = req.amount ?? 0
    const data: TransferResponse = {
      status: "SUCCESS",
      transactionNumber: `T${Date.now()}`,
      transferredAt: getNow(),
      errorCode: null,
      errorMessage: null,
      withdrawalBalanceAfter: balanceAfter(
        memberId,
        withdrawalAccountId,
        amount,
      ),
    }
    remember(key, req, data)
    return ok(data)
  }),

  http.post("*/transfers/interbank", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)
    const memberId = readSignedInMemberId()
    if (memberId == null) return unauthorized()

    const req = (await request.json()) as InterbankTransferRequest
    // 서버 인계 문서 §6-2: 은행코드·계좌번호 형식 오류는 결과가 아니라 400 이다.
    if (!isSupportedBank(req.payeeBankCode)) {
      return fail(...TRANSFER_ERROR.UNSUPPORTED_BANK)
    }
    if (!isInterbankAccountNumber(req.depositAccountNumber ?? "")) {
      return fail(...TRANSFER_ERROR.INVALID_INTERBANK_ACCOUNT_NUMBER)
    }

    const key = request.headers.get("Idempotency-Key")
    const replayed = replayOrConflict(key, req)
    if (replayed) return replayed

    const withdrawalAccountId = req.withdrawalAccountId ?? -1
    const tokenError = consumeTokens(request, memberId, withdrawalAccountId, {
      withdrawalAccountId,
      payeeBankCode: req.payeeBankCode,
      depositAccountNumber: req.depositAccountNumber,
      amount: req.amount,
    })
    if (tokenError) return tokenError

    const transactionNumber = `${Date.now()}WB`
    const unsettled = {
      transferredAt: null,
      payeeBankCode: req.payeeBankCode,
      payeeName: null,
      withdrawalBalanceAfter: null,
    }
    let data: InterbankTransferResponse
    if (req.depositAccountNumber === INTERBANK_SCENARIO.TIMEOUT) {
      // 인계 문서 §5: 처리 불명은 실패가 아니다 — 오류 정보도 비운다.
      data = {
        status: "TIMEOUT",
        transactionNumber,
        ...unsettled,
        errorCode: null,
        errorMessage: null,
      }
    } else if (req.depositAccountNumber === INTERBANK_SCENARIO.NOT_PROCESSED) {
      data = {
        status: "ERROR",
        transactionNumber,
        ...unsettled,
        errorCode: "TRF0308",
        errorMessage: "상대 은행에서 이체를 처리하지 못했습니다.",
      }
    } else {
      const amount = req.amount ?? 0
      data = {
        status: "SUCCESS",
        transactionNumber,
        // 타행 응답은 오프셋이 붙는다(인계 문서 §5). 목 실행 환경을 한국 시간으로 본다.
        transferredAt: `${getNow()}+09:00`,
        payeeBankCode: req.payeeBankCode,
        payeeName: INTERBANK_PAYEE_NAME,
        withdrawalBalanceAfter: balanceAfter(
          memberId,
          withdrawalAccountId,
          amount,
        ),
        errorCode: null,
        errorMessage: null,
      }
    }
    remember(key, req, data)
    return ok(data)
  }),
]
