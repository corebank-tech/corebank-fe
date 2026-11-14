import { describe, expect, it } from "vitest"
import {
  ApiError,
  NETWORK_ERROR_CODE,
  NETWORK_ERROR_MESSAGE,
  SESSION_EXPIRED_CODE,
  isUnknownOutcomeError,
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

/**
 * "모른다" 를 "실패" 로 뭉개면 고객이 같은 거래를 다시 넣어 두 번 빠져나간다(REQ-TRSF-016).
 * 판별이 한 줄이라 조건 하나만 어긋나도 드러나지 않아 확정·미확정을 표로 고정한다.
 */
describe("isUnknownOutcomeError", () => {
  it.each([
    ["전송 실패 — 서버에 닿았는지 모른다", NETWORK_ERROR_CODE, 0, true],
    ["envelope 없는 502 — 프록시가 끊었다", NETWORK_ERROR_CODE, 502, true],
    // 이 저장소가 장애를 내려주는 모양이다. `code === CMN9000` 으로 좁히면 이 줄이 빨개진다.
    ["envelope 있는 500 — 서버가 처리 도중 터졌다", "CMN9999", 500, true],
    ["404 업무오류 — 서버가 요청을 거부했다", "TRF0201", 404, false],
    ["409 업무오류 — 서버가 상태로 막았다", "TRF0301", 409, false],
    ["401 세션만료 — 처리 전에 막혔다", SESSION_EXPIRED_CODE, 401, false],
  ])("%s → %s", (_label, code, status, isUnknown) => {
    expect(isUnknownOutcomeError(apiError(code, "", status))).toBe(isUnknown)
  })

  it("ApiError 가 아니면 false 다 — 전송 경로의 오류가 아니다", () => {
    // 결과를 모르는 것은 맞지만 전송 경로의 오류가 아니다. 호출부가 따로 거른다.
    expect(isUnknownOutcomeError(new Error("boom"))).toBe(false)
  })
})
