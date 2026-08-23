import { describe, expect, it } from "vitest"
import { ApiError } from "@/shared/api/api-error"
import { resolveLoginFailure } from "@/entities/auth/api/login"

const apiError = (code: string, status: number) =>
  new ApiError({ code, message: "서버 메시지", status })

describe("로그인 실패 코드 매핑", () => {
  it("ATH0101 은 아이디·비밀번호 불일치다", () => {
    expect(resolveLoginFailure(apiError("ATH0101", 401))).toBe("MISMATCH")
  })

  it("ATH0102 는 계정 잠금이다", () => {
    expect(resolveLoginFailure(apiError("ATH0102", 403))).toBe("LOCKED")
  })

  // 잠금과 CSRF 실패가 같은 403 이다. 상태코드로 갈랐다면 여기서 LOCKED 가 나온다.
  it("CSRF 실패(CMN0102)는 잠금이 아니라 UNKNOWN 이다", () => {
    expect(resolveLoginFailure(apiError("CMN0102", 403))).toBe("UNKNOWN")
  })

  it("전송 실패(CMN9000)는 UNKNOWN 이다", () => {
    expect(resolveLoginFailure(apiError("CMN9000", 0))).toBe("UNKNOWN")
  })

  it("모르는 코드는 UNKNOWN 으로 떨어진다", () => {
    expect(resolveLoginFailure(apiError("ATH9999", 401))).toBe("UNKNOWN")
  })

  it("ApiError 가 아닌 오류도 UNKNOWN 이다", () => {
    expect(resolveLoginFailure(new TypeError("boom"))).toBe("UNKNOWN")
  })
})
