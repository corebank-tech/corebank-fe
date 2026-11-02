import { describe, expect, it, vi } from "vitest"
import { createCorrelationId } from "@/shared/api/correlation-id"

/** 서버가 버리는 값을 보내면 화면의 id 와 서버 로그의 id 가 갈려 추적이 끊긴다. */
describe("createCorrelationId", () => {
  it("11자리 이상 연속 숫자가 있는 값은 다시 뽑는다", () => {
    const randomUUID = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("123e4567-e89b-42d3-a456-426614174000")
      .mockReturnValueOnce("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d")

    expect(createCorrelationId()).toBe("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d")
    expect(randomUUID).toHaveBeenCalledTimes(2)
    randomUUID.mockRestore()
  })

  it("서버가 받는 값이면 그대로 쓴다", () => {
    const randomUUID = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d")

    expect(createCorrelationId()).toBe("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d")
    expect(randomUUID).toHaveBeenCalledTimes(1)
    randomUUID.mockRestore()
  })

  it("실제 생성값은 UUID 형식이고 연속 숫자가 없다", () => {
    for (let i = 0; i < 200; i += 1) {
      const id = createCorrelationId()
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      )
      expect(id).not.toMatch(/\d{11,}/)
    }
  })
})
