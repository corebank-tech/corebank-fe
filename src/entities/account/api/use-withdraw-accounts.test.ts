import { describe, expect, it } from "vitest"
import type { AccountItemResponse } from "@/shared/api/generated"
import { toWithdrawAccountOption } from "@/entities/account/api/use-withdraw-accounts"

describe("toWithdrawAccountOption", () => {
  const createAccount = (
    overrides: Partial<AccountItemResponse> = {},
  ): AccountItemResponse =>
    ({
      accountName: "생활비통장",
      accountNumber: "088106000001",
      balance: 1_000_000,
      availableBalance: 700_000,
      ...overrides,
    }) as AccountItemResponse

  it("잔액과 출금가능금액을 서로 다른 필드에서 가져온다", () => {
    const result = toWithdrawAccountOption(createAccount())

    expect(result.balance).toBe(1_000_000)
    expect(result.withdrawable).toBe(700_000)
  })

  it("출금가능금액이 0원이면 0원을 유지한다", () => {
    const result = toWithdrawAccountOption(
      createAccount({ availableBalance: 0 }),
    )

    expect(result.balance).toBe(1_000_000)
    expect(result.withdrawable).toBe(0)
  })

  it("출금가능금액이 누락되면 잔액으로 대체하지 않는다", () => {
    const result = toWithdrawAccountOption(
      createAccount({ availableBalance: undefined }),
    )

    expect(result.withdrawable).toBeNull()
  })

  it("잔액과 출금가능금액이 같을 수도 있다", () => {
    const result = toWithdrawAccountOption(
      createAccount({ availableBalance: 1_000_000 }),
    )

    expect(result.balance).toBe(1_000_000)
    expect(result.withdrawable).toBe(1_000_000)
  })
})
