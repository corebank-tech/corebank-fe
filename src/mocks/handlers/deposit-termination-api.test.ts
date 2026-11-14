import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { server } from "@/mocks/server"
import {
  MOCK_ACCOUNT_ITEMS,
  MOCK_ACCOUNT_OWNER_ID,
} from "@/mocks/handlers/accounts-api"

/**
 * 예·적금 해지 목의 규칙. 서버가 만기해지는 MATURED, 중도해지는 만기 전 ACTIVE만 받고
 * 실행은 멱등키·계좌비밀번호 인증 토큰을 요구하므로, 목이 같은 순서로 거절하는지 고정한다.
 * 계좌 픽스처에는 만기가 지난 계좌가 없어 만기해지는 거절 경로만 확인한다.
 */
const BASE = "http://localhost/api/v1"
const SESSION_KEY = "corebank-mock-session"
const MEMBER_ID = MOCK_ACCOUNT_OWNER_ID!
const DEPOSIT_PASSWORD = "1234"

const DEPOSIT_ACCOUNT_ID = MOCK_ACCOUNT_ITEMS.find(
  (e) => e.account.group === "deposit",
)!.item.accountId!

type Envelope = { code: string; data: Record<string, unknown> }

const request = async (
  method: "GET" | "POST",
  path: string,
  headers: Record<string, string> = {},
  body?: unknown,
): Promise<{ status: number; body: Envelope }> => {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body == null ? undefined : JSON.stringify(body),
  })
  return { status: response.status, body: (await response.json()) as Envelope }
}

const issueAuthToken = async (accountId: number) => {
  const { body } = await request(
    "POST",
    `/accounts/${accountId}/password/verify`,
    {},
    { accountPassword: DEPOSIT_PASSWORD },
  )
  return String(body.data.accountPasswordAuthToken)
}

const earlyTerminate = (
  accountId: number,
  idempotencyKey: string | null,
  authToken: string | null,
) =>
  request("POST", `/accounts/${accountId}/early-termination`, {
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    ...(authToken ? { "Account-Password-Auth-Token": authToken } : {}),
  })

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterAll(() => server.close())
beforeEach(() => {
  sessionStorage.clear()
  sessionStorage.setItem(SESSION_KEY, MEMBER_ID)
})

describe("예상 조회", () => {
  it("만기 전 ACTIVE 계좌는 중도해지 예상이 나오고 합계가 원금 + 세후이자다", async () => {
    const { status, body } = await request(
      "GET",
      `/accounts/${DEPOSIT_ACCOUNT_ID}/early-termination/preview`,
    )

    expect(status).toBe(200)
    expect(body.data).toMatchObject({
      accountId: DEPOSIT_ACCOUNT_ID,
      terminationType: "EARLY_TERMINATION",
    })
    const { principal, grossInterest, tax, netInterest, totalExpectedAmount } =
      body.data as Record<string, number>
    expect(netInterest).toBe(grossInterest - tax)
    expect(totalExpectedAmount).toBe(principal + netInterest)
  })

  it("만기 전 계좌의 만기해지 예상은 ACC0306(409)이다", async () => {
    const { status, body } = await request(
      "GET",
      `/accounts/${DEPOSIT_ACCOUNT_ID}/maturity-termination/preview`,
    )

    expect(status).toBe(409)
    expect(body.code).toBe("ACC0306")
  })

  it("입출금 계좌는 해지 대상이 아니다(ACC0305)", async () => {
    const checking = MOCK_ACCOUNT_ITEMS.find(
      (e) => e.account.group === "checking",
    )!
    const { status, body } = await request(
      "GET",
      `/accounts/${checking.item.accountId}/early-termination/preview`,
    )

    expect(status).toBe(409)
    expect(body.code).toBe("ACC0305")
  })

  it("로그인하지 않으면 401 CMN0101 이다", async () => {
    sessionStorage.clear()
    const { status, body } = await request(
      "GET",
      `/accounts/${DEPOSIT_ACCOUNT_ID}/early-termination/preview`,
    )

    expect(status).toBe(401)
    expect(body.code).toBe("CMN0101")
  })
})

describe("해지 실행", () => {
  it("멱등키나 인증 토큰이 없으면 CMN0002(400)이다", async () => {
    const missingKey = await earlyTerminate(DEPOSIT_ACCOUNT_ID, null, "token")
    const missingToken = await earlyTerminate(DEPOSIT_ACCOUNT_ID, "key", null)

    expect(missingKey.status).toBe(400)
    expect(missingKey.body.code).toBe("CMN0002")
    expect(missingToken.status).toBe(400)
    expect(missingToken.body.code).toBe("CMN0002")
  })

  it("다른 계좌로 받은 토큰은 APW0102(403)이다", async () => {
    const otherAccountId = MOCK_ACCOUNT_ITEMS.filter(
      (e) => e.account.group === "deposit",
    )[1]!.item.accountId!
    const token = await issueAuthToken(otherAccountId)

    const { status, body } = await earlyTerminate(
      DEPOSIT_ACCOUNT_ID,
      "key-wrong-account",
      token,
    )

    expect(status).toBe(403)
    expect(body.code).toBe("APW0102")
  })

  it("같은 멱등키로 다른 계좌를 해지하면 CMN0302(409)이다", async () => {
    const otherAccountId = MOCK_ACCOUNT_ITEMS.filter(
      (e) => e.account.group === "deposit",
    )[1]!.item.accountId!
    const token = await issueAuthToken(DEPOSIT_ACCOUNT_ID)
    await earlyTerminate(DEPOSIT_ACCOUNT_ID, "key-shared", token)

    const { status, body } = await earlyTerminate(
      otherAccountId,
      "key-shared",
      await issueAuthToken(otherAccountId),
    )

    expect(status).toBe(409)
    expect(body.code).toBe("CMN0302")
  })

  it("성공하면 계좌가 개요에서 빠지고, 같은 멱등키 재시도는 최초 응답을 돌려준다", async () => {
    const token = await issueAuthToken(DEPOSIT_ACCOUNT_ID)
    const first = await earlyTerminate(DEPOSIT_ACCOUNT_ID, "key-success", token)

    expect(first.status).toBe(200)
    expect(first.body.data).toMatchObject({ accountId: DEPOSIT_ACCOUNT_ID })

    const overview = await request("GET", "/accounts")
    const accountIds = (
      overview.body.data.items as { accounts: { accountId: number }[] }[]
    ).flatMap((group) => group.accounts.map((a) => a.accountId))
    expect(accountIds).not.toContain(DEPOSIT_ACCOUNT_ID)

    const replay = await earlyTerminate(
      DEPOSIT_ACCOUNT_ID,
      "key-success",
      "used-token",
    )
    expect(replay.status).toBe(200)
    expect(replay.body.data).toEqual(first.body.data)

    const reTerminate = await earlyTerminate(
      DEPOSIT_ACCOUNT_ID,
      "key-new",
      "any-token",
    )
    expect(reTerminate.status).toBe(404)

    const verifyClosed = await request(
      "POST",
      `/accounts/${DEPOSIT_ACCOUNT_ID}/password/verify`,
      {},
      { accountPassword: DEPOSIT_PASSWORD },
    )
    expect(verifyClosed.status).toBe(404)
  })
})
