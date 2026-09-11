import { describe, expect, it } from "vitest"
import {
  findMockAccount,
  MOCK_ACCOUNT_ITEMS,
} from "@/mocks/handlers/accounts-api"

describe("계좌 개요 MSW 목", () => {
  it("accountId 가 그룹을 넘어 겹치지 않는다", () => {
    // 그룹별로 순번을 매기면 입출금 1번과 예적금 1번이 같은 ID 가 된다.
    // 계좌비밀번호 검증·상품가입 출금계좌 목이 ID 로 계좌를 찾으므로 엉뚱한 계좌를 잡는다.
    const ids = MOCK_ACCOUNT_ITEMS.map((entry) => entry.item.accountId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("accountId 로 찾으면 같은 계좌가 나온다", () => {
    for (const entry of MOCK_ACCOUNT_ITEMS) {
      expect(
        findMockAccount(entry.item.accountId ?? 0)?.account.accountNo,
      ).toBe(entry.account.accountNo)
    }
  })
})
