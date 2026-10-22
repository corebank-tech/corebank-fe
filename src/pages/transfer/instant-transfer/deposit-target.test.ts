import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { http, HttpResponse } from "msw"
import { server } from "@/mocks/server"
import {
  checkDepositAccountNumber,
  resolveDepositTarget,
} from "@/pages/transfer/instant-transfer/deposit-target"

const FROM = "110632892336"

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("checkDepositAccountNumber", () => {
  it.each([
    [
      "당행 11자리",
      null,
      "11063289233",
      "입금계좌번호 12자리를 정확히 입력하세요.",
    ],
    [
      "당행 13자리",
      null,
      "1106328923361",
      "입금계좌번호 12자리를 정확히 입력하세요.",
    ],
    [
      "당행 출금계좌와 같음",
      null,
      FROM,
      "출금계좌와 입금계좌가 동일합니다. 다른 계좌를 입력하세요.",
    ],
    ["타행 빈 값", "004", "", "타행 계좌번호는 숫자 1~16자리로 입력하세요."],
    [
      "타행 17자리",
      "004",
      "12345678901234567",
      "타행 계좌번호는 숫자 1~16자리로 입력하세요.",
    ],
  ])("%s 이면 조회 전에 막는다", (_label, bank, accountNo, message) => {
    expect(checkDepositAccountNumber(bank, accountNo, FROM)).toBe(message)
  })

  // 은행마다 자릿수가 달라 당행 12자리 규칙을 타행에 걸면 정상 계좌를 막는다.
  it.each([
    ["타행 1자리", "1"],
    ["타행 13자리", "1234567890123"],
    ["타행 16자리", "1234567890123456"],
    ["타행인데 출금계좌와 같은 숫자", FROM],
  ])("%s 는 통과한다", (_label, accountNo) => {
    expect(checkDepositAccountNumber("004", accountNo, FROM)).toBeNull()
  })
})

describe("resolveDepositTarget", () => {
  it("입력 오류면 조회하지 않는다", async () => {
    let called = false
    server.use(
      http.get("*/transfers/payee", () => {
        called = true
        return HttpResponse.json(null, { status: 500 })
      }),
    )

    const checked = await resolveDepositTarget(null, "123", FROM)

    expect(called).toBe(false)
    expect(checked.toConfirmed).toBe(false)
  })

  it("타행 조회가 성공하면 확인됨과 예금주를 돌려준다", async () => {
    server.use(
      http.get("*/transfers/interbank/payee", () =>
        HttpResponse.json({
          code: "0000",
          message: "",
          data: { payeeName: "박*준" },
        }),
      ),
    )

    await expect(
      resolveDepositTarget("004", "1234567890123", FROM),
    ).resolves.toEqual({
      toConfirmed: true,
      payeeName: "박*준",
      toAccountError: null,
    })
  })

  // REQ-TRSF-004·corebank-server#680: 실패는 구분된 서버 문구로 안내하고 [다음]을 막는다.
  it.each([
    ["TRF0201", 404, "입금계좌를 찾을 수 없습니다."],
    ["TRF0301", 409, "거래정지 또는 해지 상태의 입금계좌입니다."],
    ["TRF0309", 409, "상대 은행에서 예금주를 확인하지 못했습니다."],
  ])("타행 조회 %s 는 서버 문구로 막는다", async (code, status, message) => {
    server.use(
      http.get("*/transfers/interbank/payee", () =>
        HttpResponse.json({ code, message, data: null }, { status }),
      ),
    )

    await expect(
      resolveDepositTarget("004", "1234567890123", FROM),
    ).resolves.toEqual({
      toConfirmed: false,
      payeeName: "",
      toAccountError: message,
    })
  })
})
