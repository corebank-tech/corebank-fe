import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import { useQueryBaseTime } from "@/shared/lib/hooks/use-base-time"

describe("useQueryBaseTime", () => {
  it("데이터를 한 번도 받지 못했으면 0을 돌려준다", () => {
    const { result } = renderHook(() =>
      useQueryBaseTime({ dataUpdatedAt: 0, isPlaceholderData: false }),
    )
    expect(result.current).toBe(0)
  })

  it("placeholder 구간에는 직전에 받은 시각을 유지한다", () => {
    const { result, rerender } = renderHook(
      (props: { dataUpdatedAt: number; isPlaceholderData: boolean }) =>
        useQueryBaseTime(props),
      { initialProps: { dataUpdatedAt: 1000, isPlaceholderData: false } },
    )
    expect(result.current).toBe(1000)

    // 조회조건·페이지를 바꾸면 새 쿼리 키의 dataUpdatedAt은 0으로 시작한다.
    rerender({ dataUpdatedAt: 0, isPlaceholderData: true })
    expect(result.current).toBe(1000)

    rerender({ dataUpdatedAt: 2000, isPlaceholderData: false })
    expect(result.current).toBe(2000)
  })
})
