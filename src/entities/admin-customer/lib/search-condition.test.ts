import { describe, expect, it } from "vitest"
import {
  EMPTY_ADMIN_CUSTOMER_CONDITION,
  toSearchParams,
  type AdminCustomerSearchCondition,
} from "@/entities/admin-customer/lib/search-condition"

const condition = (
  overrides: Partial<AdminCustomerSearchCondition>,
): AdminCustomerSearchCondition => ({
  ...EMPTY_ADMIN_CUSTOMER_CONDITION,
  ...overrides,
})

describe("toSearchParams", () => {
  it("빈 문자열과 '전체' 상태는 파라미터로 보내지 않는다", () => {
    expect(toSearchParams(EMPTY_ADMIN_CUSTOMER_CONDITION)).toEqual({})
  })

  it("문자열 조건은 앞뒤 공백을 버리고 보낸다", () => {
    expect(
      toSearchParams(
        condition({ userId: " uat1104p ", userName: "박서", email: " a@b.c " }),
      ),
    ).toEqual({ userId: "uat1104p", userName: "박서", email: "a@b.c" })
  })

  it("공백만 입력한 칸은 조건으로 치지 않는다", () => {
    expect(toSearchParams(condition({ userId: "   " }))).toEqual({})
  })

  // 상태 필터는 status 와 accountLocked 두 축으로 나뉘어 나간다.
  it.each([
    ["locked", { accountLocked: true }],
    ["suspended", { status: "SUSPENDED" }],
    ["active", { status: "ACTIVE", accountLocked: false }],
  ] as const)("상태 '%s' 를 서버 파라미터로 바꾼다", (status, expected) => {
    expect(toSearchParams(condition({ userId: "uat1", status }))).toEqual({
      userId: "uat1",
      ...expected,
    })
  })
})
