import { describe, expect, it } from "vitest"
import {
  hasAnyWritePermission,
  hasPermission,
  readSessionAuthority,
} from "@/entities/auth/lib/session-role"

describe("readSessionAuthority — 역할", () => {
  it("역할 필드가 없으면 고객으로 본다", () => {
    // 서버가 아직 역할을 내려주지 않는 상태(2026-09-18 기준)가 이 경우다.
    // 여기서 ADMIN 으로 떨어지면 관리자 화면이 전원에게 열린다.
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

  it("CSV 문자열로 와도 읽는다", () => {
    // DB 가 CSV 컬럼이라 응답 모양이 확정되기 전까지 둘 다 받는다(#147).
    expect(
      readSessionAuthority({
        role: "ADMIN",
        permissions: "GL_READ, AUDIT_READ",
      }).permissions,
    ).toEqual(["GL_READ", "AUDIT_READ"])
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

  it("중복된 권한은 한 번만 남긴다", () => {
    expect(
      readSessionAuthority({
        role: "ADMIN",
        permissions: "GL_READ,GL_READ",
      }).permissions,
    ).toEqual(["GL_READ"])
  })

  it("빈 문자열은 빈 목록으로 읽는다", () => {
    // CSV 컬럼이 비어 있으면 `""` 가 온다. `"".split(",")` 는 `[""]` 라
    // 걸러지지 않으면 모르는 권한 하나가 들어온 것처럼 다뤄진다.
    expect(
      readSessionAuthority({ role: "ADMIN", permissions: "" }).permissions,
    ).toEqual([])
  })

  it("권한 필드가 배열도 문자열도 아니면 빈 목록이다", () => {
    expect(
      readSessionAuthority({ role: "ADMIN", permissions: { a: 1 } })
        .permissions,
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
