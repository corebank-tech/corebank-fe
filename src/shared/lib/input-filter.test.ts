import { describe, expect, it } from "vitest"
import { onlyDigits } from "@/shared/lib/input-filter"

describe("onlyDigits", () => {
  it("숫자가 아닌 문자를 제거한다", () => {
    expect(onlyDigits("010-1234-5678", 20)).toBe("01012345678")
  })

  it("최대 길이로 자른다", () => {
    expect(onlyDigits("123456789", 4)).toBe("1234")
  })
})
