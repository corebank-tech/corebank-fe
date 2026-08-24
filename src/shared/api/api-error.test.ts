import { describe, expect, it } from "vitest"
import {
  ApiError,
  NETWORK_ERROR_MESSAGE,
  SESSION_EXPIRED_CODE,
  toErrorMessage,
} from "@/shared/api/api-error"

const apiError = (code: string, message: string, status = 400) =>
  new ApiError({ code, message, status })

describe("toErrorMessage", () => {
  it("REQ-CMN-008: 서버가 준 message 를 그대로 돌려준다", () => {
    expect(
      toErrorMessage(apiError("CMN0003", "조회기간은 1년을 넘을 수 없습니다.")),
    ).toBe("조회기간은 1년을 넘을 수 없습니다.")
  })

  it("세션 만료는 null 이다 — A-11 모달이 안내하므로 화면은 비워 둔다", () => {
    expect(
      toErrorMessage(
        apiError(
          SESSION_EXPIRED_CODE,
          "인증정보가 없거나 세션이 만료되었습니다.",
          401,
        ),
      ),
    ).toBeNull()
  })

  it("로그인 실패도 401 이지만 세션 만료가 아니라 문구를 그대로 쓴다", () => {
    expect(
      toErrorMessage(
        apiError("ATH0101", "아이디 또는 비밀번호가 일치하지 않습니다.", 401),
      ),
    ).toBe("아이디 또는 비밀번호가 일치하지 않습니다.")
  })

  it("ApiError 가 아니면 전송 실패 문구를 쓴다", () => {
    expect(toErrorMessage(new Error("boom"))).toBe(NETWORK_ERROR_MESSAGE)
  })
})
