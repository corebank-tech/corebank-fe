import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { http, HttpResponse } from "msw"
import { server } from "@/mocks/server"
import { ApiError } from "@/shared/api/api-error"
import {
  executeTransferIntent,
  fetchPayeeFor,
} from "@/entities/transfer/api/use-instant-transfer"
import type { TransferIntent } from "@/entities/transfer/lib/transfer-intent"

const ok = (data: unknown) =>
  HttpResponse.json({ code: "0000", message: "정상 처리되었습니다.", data })

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("fetchPayeeFor", () => {
  it("입금은행이 없으면 당행 예금주 조회를 부른다", async () => {
    let hit: URL | null = null
    server.use(
      http.get("*/transfers/payee", ({ request }) => {
        hit = new URL(request.url)
        return ok({ accountId: 7, payeeName: "김*지" })
      }),
    )

    await expect(fetchPayeeFor(null, "333330730135")).resolves.toEqual({
      payeeName: "김*지",
    })
    expect(hit!.searchParams.get("accountNumber")).toBe("333330730135")
  })

  it("입금은행이 있으면 타행 예금주 조회를 은행코드와 함께 부른다", async () => {
    let hit: URL | null = null
    server.use(
      http.get("*/transfers/interbank/payee", ({ request }) => {
        hit = new URL(request.url)
        return ok({ payeeName: "박*수" })
      }),
    )

    await expect(fetchPayeeFor("004", "1234567890123")).resolves.toEqual({
      payeeName: "박*수",
    })
    expect(hit!.searchParams.get("bankCode")).toBe("004")
    expect(hit!.searchParams.get("accountNumber")).toBe("1234567890123")
  })

  // corebank-server#680: 상대 은행 무응답은 409 TRF0309. 화면이 문구를 그대로 띄운다.
  it("타행 조회 실패는 서버 코드·문구를 담은 ApiError 로 던진다", async () => {
    server.use(
      http.get("*/transfers/interbank/payee", () =>
        HttpResponse.json(
          {
            code: "TRF0309",
            message: "상대 은행에서 예금주를 확인하지 못했습니다.",
            data: null,
          },
          { status: 409 },
        ),
      ),
    )

    const error = await fetchPayeeFor("004", "1234567890123").catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      code: "TRF0309",
      message: "상대 은행에서 예금주를 확인하지 못했습니다.",
    })
  })
})

describe("executeTransferIntent", () => {
  const intent = (over: Partial<TransferIntent> = {}): TransferIntent => ({
    withdrawalAccountId: 1,
    payeeBankCode: null,
    depositAccountNumber: "333330730135",
    amount: 30_000,
    myPassbookMemo: "",
    recipientPassbookMemo: "",
    ...over,
  })
  const tokens = {
    accountPasswordAuthToken: "pw-token",
    otpAuthToken: "otp-token",
    idempotencyKey: "key-1",
  }

  it("당행이면 당행 실행 API 로 보내고 받는 분 이름은 비운다", async () => {
    let body: unknown = null
    let headers: Headers | null = null
    server.use(
      http.post("*/transfers", async ({ request }) => {
        body = await request.json()
        headers = request.headers
        return ok({
          status: "SUCCESS",
          transactionNumber: "T1",
          transferredAt: "2026-10-22T10:00:00",
          withdrawalBalanceAfter: 970_000,
        })
      }),
      http.post("*/transfers/interbank", () =>
        HttpResponse.json(null, { status: 500 }),
      ),
    )

    const result = await executeTransferIntent({ intent: intent(), ...tokens })

    expect(body).not.toHaveProperty("payeeBankCode")
    expect(headers!.get("Idempotency-Key")).toBe("key-1")
    expect(headers!.get("Otp-Auth-Token")).toBe("otp-token")
    expect(result).toMatchObject({
      status: "SUCCESS",
      withdrawalBalanceAfter: 970_000,
      payeeName: null,
    })
  })

  it("타행이면 타행 실행 API 로 은행코드를 실어 보내고, 응답의 받는 분 이름을 옮긴다", async () => {
    let body: unknown = null
    server.use(
      http.post("*/transfers/interbank", async ({ request }) => {
        body = await request.json()
        return ok({
          status: "SUCCESS",
          transactionNumber: "20261023WB0000000123",
          transferredAt: "2026-10-23T10:30:16+09:00",
          payeeBankCode: "004",
          payeeName: "김*수",
          withdrawalBalanceAfter: 950_000,
          errorCode: null,
          errorMessage: null,
        })
      }),
      http.post("*/transfers", () => HttpResponse.json(null, { status: 500 })),
    )

    const result = await executeTransferIntent({
      intent: intent({
        payeeBankCode: "004",
        depositAccountNumber: "1234567890123",
      }),
      ...tokens,
    })

    expect(body).toMatchObject({
      payeeBankCode: "004",
      depositAccountNumber: "1234567890123",
    })
    expect(result).toMatchObject({
      status: "SUCCESS",
      payeeName: "김*수",
      withdrawalBalanceAfter: 950_000,
    })
  })

  // 인계 문서 §5: TIMEOUT 이면 이름·잔액·처리시각이 null 이다. null 을 0원이나 빈 시각으로
  // 바꾸지 않고 "없음"으로 넘겨야 화면이 끝나지 않은 이체를 끝난 것처럼 그리지 않는다.
  it("타행 TIMEOUT 은 이름·잔액·처리시각을 비운 채로 넘긴다", async () => {
    server.use(
      http.post("*/transfers/interbank", () =>
        ok({
          status: "TIMEOUT",
          transactionNumber: "20261023WB0000000125",
          transferredAt: null,
          payeeBankCode: "004",
          payeeName: null,
          withdrawalBalanceAfter: null,
          errorCode: null,
          errorMessage: null,
        }),
      ),
    )

    const result = await executeTransferIntent({
      intent: intent({ payeeBankCode: "004" }),
      ...tokens,
    })

    expect(result).toEqual({
      status: "TIMEOUT",
      transactionNumber: "20261023WB0000000125",
      transferredAt: null,
      errorCode: null,
      errorMessage: null,
      withdrawalBalanceAfter: undefined,
      payeeName: null,
    })
  })
})
