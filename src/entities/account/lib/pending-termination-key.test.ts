import { afterEach, describe, expect, it } from "vitest"
import {
  clearPendingTerminationKey,
  getOrCreatePendingTerminationKey,
  readPendingTerminationKey,
} from "@/entities/account/lib/pending-termination-key"

afterEach(() => sessionStorage.clear())

describe("pending-termination-key", () => {
  it("같은 계좌·유형이면 보관한 키를 이어 쓴다", () => {
    const first = getOrCreatePendingTerminationKey(6, "early")
    expect(getOrCreatePendingTerminationKey(6, "early")).toBe(first)
    expect(readPendingTerminationKey(6, "early")).toBe(first)
  })

  it("계좌나 해지 유형이 다르면 다른 키다", () => {
    const early = getOrCreatePendingTerminationKey(6, "early")
    expect(getOrCreatePendingTerminationKey(7, "early")).not.toBe(early)
    expect(getOrCreatePendingTerminationKey(6, "maturity")).not.toBe(early)
  })

  it("지우면 다음 요청은 새 키를 만든다", () => {
    const first = getOrCreatePendingTerminationKey(6, "early")
    clearPendingTerminationKey(6, "early")
    expect(readPendingTerminationKey(6, "early")).toBeNull()
    expect(getOrCreatePendingTerminationKey(6, "early")).not.toBe(first)
  })
})
