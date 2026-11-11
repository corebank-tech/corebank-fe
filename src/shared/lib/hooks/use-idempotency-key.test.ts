import { describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"
import { useIdempotencyKey } from "@/shared/lib/hooks/use-idempotency-key"

describe("useIdempotencyKey", () => {
  it("같은 내용을 다시 보내면 같은 키를 쓴다", () => {
    const { result } = renderHook(() => useIdempotencyKey())

    const first = result.current.keyFor({ result: "REJECTED", reason: "a" })
    const retry = result.current.keyFor({ result: "REJECTED", reason: "a" })

    expect(retry).toBe(first)
  })

  it("내용을 고치면 새 키를 만든다", () => {
    const { result } = renderHook(() => useIdempotencyKey())

    const first = result.current.keyFor({ reason: "a" })
    const changed = result.current.keyFor({ reason: "b" })

    expect(changed).not.toBe(first)
  })

  it("성공 뒤 비우면 같은 내용이라도 새 거래로 본다", () => {
    const { result } = renderHook(() => useIdempotencyKey())

    const first = result.current.keyFor({ reason: "a" })
    result.current.reset()

    expect(result.current.keyFor({ reason: "a" })).not.toBe(first)
  })
})
