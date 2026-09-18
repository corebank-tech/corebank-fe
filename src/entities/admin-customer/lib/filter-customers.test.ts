import { describe, expect, it } from "vitest"
import {
  EMPTY_ADMIN_CUSTOMER_CONDITION,
  filterCustomers,
  type AdminCustomerSearchCondition,
} from "@/entities/admin-customer/lib/filter-customers"
import type { AdminCustomer } from "@/entities/admin-customer/api/adm01-customers"

/**
 * 상태 필터가 `status`·`accountLocked` 두 축을 겹쳐 보므로 네 선택지 각각에
 * 어떤 조합이 걸리는지를 고정한다. 목 데이터가 아니라 이 파일에서 만든 최소
 * 픽스처를 쓴다 — 목이 늘거나 줄어도 이 테스트가 흔들리면 안 된다.
 */
const customer = (
  id: number,
  overrides: Partial<AdminCustomer> = {},
): AdminCustomer => ({
  customerId: id,
  userId: `user${id}`,
  userName: `이름${id}`,
  birthDate: "1990-01-01",
  email: `user${id}@example.com`,
  phoneNumber: "01012345678",
  loginFailureCount: 0,
  accountLocked: false,
  status: "ACTIVE",
  lastLoginAt: null,
  joinedAt: "2026-01-01T00:00:00",
  ...overrides,
})

const NORMAL = customer(1)
const SUSPENDED = customer(2, { status: "SUSPENDED" })
const LOCKED = customer(3, { accountLocked: true, loginFailureCount: 5 })
const SUSPENDED_AND_LOCKED = customer(4, {
  status: "SUSPENDED",
  accountLocked: true,
})

const ALL = [NORMAL, SUSPENDED, LOCKED, SUSPENDED_AND_LOCKED]

const withCondition = (
  overrides: Partial<AdminCustomerSearchCondition>,
): AdminCustomerSearchCondition => ({
  ...EMPTY_ADMIN_CUSTOMER_CONDITION,
  ...overrides,
})

describe("filterCustomers — 상태 필터", () => {
  it("전체는 아무것도 거르지 않는다", () => {
    expect(filterCustomers(ALL, EMPTY_ADMIN_CUSTOMER_CONDITION)).toEqual(ALL)
  })

  it("정상은 정지도 잠김도 아닌 계정만 남긴다", () => {
    expect(filterCustomers(ALL, withCondition({ status: "active" }))).toEqual([
      NORMAL,
    ])
  })

  it("정지는 잠겨 있는 정지 계정도 포함한다", () => {
    expect(
      filterCustomers(ALL, withCondition({ status: "suspended" })),
    ).toEqual([SUSPENDED, SUSPENDED_AND_LOCKED])
  })

  it("잠김은 정지 여부와 무관하게 잠긴 계정을 모은다", () => {
    expect(filterCustomers(ALL, withCondition({ status: "locked" }))).toEqual([
      LOCKED,
      SUSPENDED_AND_LOCKED,
    ])
  })
})

describe("filterCustomers — 문자열 조건", () => {
  const 홍길동 = customer(10, {
    userId: "honggildong",
    userName: "홍길동",
    email: "hong@corebank.example.com",
  })
  const 박서준 = customer(11, {
    userId: "seojunpark",
    userName: "박서준",
    email: "seojun@corebank.example.com",
  })
  const rows = [홍길동, 박서준]

  it("아이디는 부분일치이고 대소문자를 가리지 않는다", () => {
    expect(filterCustomers(rows, withCondition({ userId: "GILD" }))).toEqual([
      홍길동,
    ])
  })

  it("이메일도 부분일치이고 대소문자를 가리지 않는다", () => {
    expect(filterCustomers(rows, withCondition({ email: "SEOJUN" }))).toEqual([
      박서준,
    ])
  })

  it("성명은 부분일치한다", () => {
    expect(filterCustomers(rows, withCondition({ userName: "길동" }))).toEqual([
      홍길동,
    ])
  })

  it("앞뒤 공백만 있는 조건은 조건이 없는 것으로 다룬다", () => {
    expect(filterCustomers(rows, withCondition({ userId: "   " }))).toEqual(
      rows,
    )
  })

  it("조건 여러 개는 AND 로 걸린다", () => {
    expect(
      filterCustomers(
        rows,
        withCondition({ userId: "hong", userName: "박서준" }),
      ),
    ).toEqual([])
  })

  it("일치하는 고객이 없으면 빈 배열이다", () => {
    expect(
      filterCustomers(rows, withCondition({ userId: "없는아이디" })),
    ).toEqual([])
  })
})
