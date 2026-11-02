import { describe, expect, it } from "vitest"
import {
  hasAnyWritePermission,
  hasPermission,
  readSessionAuthority,
} from "@/entities/auth/lib/session-role"

describe("readSessionAuthority — 역할", () => {
  it("역할 필드가 없으면 고객으로 본다", () => {
    // 필드가 빠진 응답이 와도 여기서 ADMIN 으로 떨어지면 관리자 화면이
    // 전원에게 열린다.
    expect(readSessionAuthority({ customerId: 1 })).toEqual({
      role: "CUSTOMER",
      permissions: [],
    })
  })

  it("응답 자체가 없어도 고객으로 본다", () => {
    expect(readSessionAuthority(undefined)).toEqual({
      role: "CUSTOMER",
      permissions: [],
    })
    expect(readSessionAuthority(null)).toEqual({
      role: "CUSTOMER",
      permissions: [],
    })
  })

  it("모르는 역할 값은 고객으로 떨어뜨린다", () => {
    expect(readSessionAuthority({ role: "SUPERUSER" }).role).toBe("CUSTOMER")
  })
})

describe("readSessionAuthority — 권한", () => {
  it("관리자여도 권한 목록이 없으면 조회 전용이다", () => {
    // 직무분리(PH-49). 관리자라는 사실만으로 권한이 따라오지 않는다.
    expect(readSessionAuthority({ role: "ADMIN" })).toEqual({
      role: "ADMIN",
      permissions: [],
    })
  })

  it("배열로 온 권한을 읽는다", () => {
    expect(
      readSessionAuthority({
        role: "ADMIN",
        permissions: ["CUSTOMER_READ", "CUSTOMER_WRITE"],
      }).permissions,
    ).toEqual(["CUSTOMER_READ", "CUSTOMER_WRITE"])
  })

  it("모르는 권한 값은 버린다", () => {
    // 서버가 집합을 늘렸는데 FE 가 아직 모르는 상황에서 화면이 깨지는 것보다
    // 그 권한이 없는 것으로 보는 쪽이 안전하다.
    expect(
      readSessionAuthority({
        role: "ADMIN",
        permissions: ["CUSTOMER_READ", "LEDGER_DESTROY", 42, null],
      }).permissions,
    ).toEqual(["CUSTOMER_READ"])
  })

  it.each([
    ["CSV 문자열", "GL_READ,AUDIT_READ"],
    ["객체", { a: 1 }],
  ])("권한 필드가 배열이 아니면(%s) 빈 목록이다", (_case, permissions) => {
    // 서버 계약은 배열이다. 다른 모양에서 권한을 만들어내는 것보다 권한이
    // 없는 것으로 보는 쪽이 안전하다.
    expect(
      readSessionAuthority({ role: "ADMIN", permissions }).permissions,
    ).toEqual([])
  })

  it("고객에게는 권한이 붙어 있어도 무시한다", () => {
    // 고객 채널은 직무분리 대상이 아니다. 값이 새어 들어와도 승격되지 않는다.
    expect(
      readSessionAuthority({
        role: "CUSTOMER",
        permissions: ["CUSTOMER_WRITE"],
      }),
    ).toEqual({ role: "CUSTOMER", permissions: [] })
  })
})

describe("hasPermission", () => {
  it("가진 권한이면 참이다", () => {
    expect(
      hasPermission(["CUSTOMER_READ", "CUSTOMER_WRITE"], "CUSTOMER_WRITE"),
    ).toBe(true)
  })

  it("없는 권한이면 거짓이다", () => {
    expect(hasPermission(["CUSTOMER_READ"], "CUSTOMER_WRITE")).toBe(false)
    expect(hasPermission([], "GL_READ")).toBe(false)
  })

  it("다른 기능의 변경 권한으로는 통과하지 않는다", () => {
    // GL_WRITE 만 가진 관리자에게 고객 정지 버튼이 보이면 안 된다.
    expect(hasPermission(["GL_WRITE"], "CUSTOMER_WRITE")).toBe(false)
  })
})

describe("hasAnyWritePermission", () => {
  it("변경 권한이 하나라도 있으면 참이다", () => {
    expect(hasAnyWritePermission(["AUDIT_READ", "GL_WRITE"])).toBe(true)
  })

  it("조회 권한만 있으면 거짓이다", () => {
    expect(
      hasAnyWritePermission(["GL_READ", "CUSTOMER_READ", "AUDIT_READ"]),
    ).toBe(false)
  })

  it("권한이 없으면 거짓이다", () => {
    expect(hasAnyWritePermission([])).toBe(false)
  })
})
