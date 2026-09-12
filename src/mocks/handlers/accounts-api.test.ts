import { describe, expect, it } from "vitest"
import { MOCK_OVERVIEW_ACCOUNTS } from "@/entities/account"
import { MOCK_MEMBERS } from "@/entities/auth"
import {
  findMockAccount,
  MOCK_ACCOUNT_ITEMS,
  MOCK_ACCOUNT_OWNER_ID,
} from "@/mocks/handlers/accounts-api"

describe("계좌 개요 MSW 목", () => {
  it("accountId 가 그룹을 넘어 겹치지 않는다", () => {
    // 그룹별로 순번을 매기면 입출금 1번과 예적금 1번이 같은 ID 가 된다.
    // 계좌비밀번호 검증·상품가입 출금계좌 목이 ID 로 계좌를 찾으므로 엉뚱한 계좌를 잡는다.
    const ids = MOCK_ACCOUNT_ITEMS.map((entry) => entry.item.accountId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("소유자는 정본 첫 계좌번호를 가진 회원이다", () => {
    // 소유자를 못 찾으면 모든 계좌 목이 "없는 계좌"로 떨어진다.
    const owner = MOCK_MEMBERS.find((m) => m.memberId === MOCK_ACCOUNT_OWNER_ID)
    expect(owner?.accountNo).toBe(MOCK_OVERVIEW_ACCOUNTS[0]?.accountNo)
  })

  it("소유자가 accountId 로 찾으면 같은 계좌가 나온다", () => {
    for (const entry of MOCK_ACCOUNT_ITEMS) {
      expect(
        findMockAccount(entry.item.accountId ?? 0, MOCK_ACCOUNT_OWNER_ID ?? "")
          ?.account.accountNo,
      ).toBe(entry.account.accountNo)
    }
  })

  it("소유자가 아니면 계좌를 찾지 못한다", () => {
    const other = MOCK_MEMBERS.find((m) => m.memberId !== MOCK_ACCOUNT_OWNER_ID)
    expect(findMockAccount(1, other?.memberId ?? "")).toBeUndefined()
  })
})
