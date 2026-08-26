import { describe, expect, it } from "vitest"
import {
  isSameTransferIntent,
  toOtpTransactionData,
  toTransferRequest,
  type TransferIntent,
} from "@/entities/transfer/lib/transfer-intent"

const intent = (over: Partial<TransferIntent> = {}): TransferIntent => ({
  withdrawalAccountId: 1,
  depositAccountNumber: "333330730135",
  amount: 500_000,
  myPassbookMemo: "생활비",
  recipientPassbookMemo: "생활비",
  ...over,
})

describe("isSameTransferIntent", () => {
  it("내용이 같으면 같은 거래다 — 미상으로 끝난 실행을 같은 멱등키로 재시도한다", () => {
    expect(isSameTransferIntent(intent(), intent())).toBe(true)
  })

  it("이전 거래가 없으면 같지 않다", () => {
    expect(isSameTransferIntent(null, intent())).toBe(false)
  })

  // REQ-TRSF-016: 아래 다섯 필드가 실행 요청 본문이다. 하나라도 바뀌면 다른 거래라
  // 새 멱등키를 써야 한다 — 같은 키로 보내면 서버가 앞선 거래 결과를 돌려준다.
  it.each([
    ["출금계좌", { withdrawalAccountId: 2 }],
    ["입금계좌", { depositAccountNumber: "444401122938" }],
    ["이체금액", { amount: 5_000_000 }],
    ["내 통장 표시내용", { myPassbookMemo: "월세" }],
    ["받는분 통장 표시내용", { recipientPassbookMemo: "월세" }],
  ])("%s가 바뀌면 다른 거래다", (_label, changed) => {
    expect(isSameTransferIntent(intent(), intent(changed))).toBe(false)
  })

  it("입력 중이라 금액이 비어 있어도 이전 값과 다르면 다른 거래다", () => {
    expect(isSameTransferIntent(intent(), intent({ amount: null }))).toBe(false)
  })
})

describe("toTransferRequest", () => {
  it("거래 내용을 그대로 요청 본문으로 옮긴다", () => {
    expect(toTransferRequest(intent())).toEqual({
      withdrawalAccountId: 1,
      depositAccountNumber: "333330730135",
      amount: 500_000,
      myPassbookMemo: "생활비",
      recipientPassbookMemo: "생활비",
    })
  })

  it("표시내용이 비면 보내지 않는다 — 서버가 빈 문자열을 통장에 찍지 않게 한다", () => {
    const request = toTransferRequest(
      intent({ myPassbookMemo: "", recipientPassbookMemo: "" }),
    )
    expect(request.myPassbookMemo).toBeUndefined()
    expect(request.recipientPassbookMemo).toBeUndefined()
  })
})

describe("toOtpTransactionData", () => {
  // 서버가 OTP 발급 시점의 거래정보와 실행 요청을 대조한다(OTP0102).
  it("실행 요청과 같은 값을 쓴다", () => {
    const request = toTransferRequest(intent())
    expect(toOtpTransactionData(intent())).toEqual({
      withdrawalAccountId: request.withdrawalAccountId,
      depositAccountNumber: request.depositAccountNumber,
      amount: request.amount,
    })
  })
})
