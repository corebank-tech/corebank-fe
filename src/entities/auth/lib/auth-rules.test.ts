import { describe, expect, it } from "vitest"
import { isPasswordValid } from "@/entities/auth/lib/auth-rules"

describe("비밀번호 공통 검증 규칙", () => {
  const userId = "testuser"

  it("영문·숫자·특수문자가 모두 있으면 통과한다", () => {
    expect(isPasswordValid("Corebank!79", userId)).toBe(true)
  })

  it("특수문자가 없으면 거부한다", () => {
    expect(isPasswordValid("Qwerty79", userId)).toBe(false)
  })

  it("숫자가 없으면 거부한다", () => {
    expect(isPasswordValid("Corebank!", userId)).toBe(false)
  })

  it("공백이 있으면 거부한다", () => {
    expect(isPasswordValid("Core bank!79", userId)).toBe(false)
  })

  it("영문자 연속은 숫자 연속 규칙으로 거부하지 않는다", () => {
    expect(isPasswordValid("Abcde!79", userId)).toBe(true)
  })

  it("4자리 연속 숫자를 거부한다", () => {
    expect(isPasswordValid("Abc!1234", userId)).toBe(false)
    expect(isPasswordValid("Abc!4321", userId)).toBe(false)
  })

  it("동일한 문자가 4번 연속되면 거부한다", () => {
    expect(isPasswordValid("Abc!4444", userId)).toBe(false)
  })

  it("아이디가 비밀번호에 포함되면 거부한다", () => {
    expect(isPasswordValid("Testuser!79", userId)).toBe(false)
  })
})
