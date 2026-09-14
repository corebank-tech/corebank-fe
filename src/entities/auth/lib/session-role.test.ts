import { describe, expect, it } from "vitest"
import { readSessionAuthority } from "@/entities/auth/lib/session-role"

describe("readSessionAuthority", () => {
  it("역할 필드가 없으면 고객으로 본다", () => {
    // 서버가 아직 역할을 내려주지 않는 상태(2026-09-10 기준)가 이 경우다.
    // 여기서 ADMIN 으로 떨어지면 관리자 화면이 전원에게 열린다.
    expect(readSessionAuthority({ customerId: 1 })).toEqual({
      role: "CUSTOMER",
      canModify: false,
    })
  })

  it("응답 자체가 없어도 고객으로 본다", () => {
    expect(readSessionAuthority(undefined)).toEqual({
      role: "CUSTOMER",
      canModify: false,
    })
    expect(readSessionAuthority(null)).toEqual({
      role: "CUSTOMER",
      canModify: false,
    })
  })

  it("모르는 역할 값은 고객으로 떨어뜨린다", () => {
    expect(readSessionAuthority({ role: "SUPERUSER" }).role).toBe("CUSTOMER")
  })

  it("관리자여도 변경 권한이 없으면 조회 전용이다", () => {
    // 직무분리(PH-49). 관리자라는 사실만으로 변경 권한이 따라오지 않는다.
    expect(readSessionAuthority({ role: "ADMIN" })).toEqual({
      role: "ADMIN",
      canModify: false,
    })
    expect(readSessionAuthority({ role: "ADMIN", canModify: false })).toEqual({
      role: "ADMIN",
      canModify: false,
    })
  })

  it("고객에게는 변경 권한 플래그가 붙어 있어도 무시한다", () => {
    // 고객 채널은 직무분리 대상이 아니다. 플래그가 새어 들어와도 승격되지 않는다.
    expect(readSessionAuthority({ role: "CUSTOMER", canModify: true })).toEqual(
      {
        role: "CUSTOMER",
        canModify: false,
      },
    )
  })

  it("관리자 + 변경 권한이면 변경 가능이다", () => {
    expect(readSessionAuthority({ role: "ADMIN", canModify: true })).toEqual({
      role: "ADMIN",
      canModify: true,
    })
  })
})
