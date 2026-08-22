import { describe, it, expect } from "vitest"
import { MOCK_RESERVATIONS } from "@/entities/transfer"
import { getToday } from "@/shared/config/clock"

describe("MOCK_RESERVATIONS", () => {
  it("'대기' 건의 이체 예정일은 오늘 이후다", () => {
    const today = getToday()
    const waiting = MOCK_RESERVATIONS.filter((r) => r.status === "대기")
    expect(waiting.length).toBeGreaterThan(0)
    expect(waiting.every((r) => r.scheduledDate > today)).toBe(true)
  })

  it("'완료'·'실패'·'취소' 건의 이체 예정일은 오늘 이전이다", () => {
    const today = getToday()
    const settled = MOCK_RESERVATIONS.filter((r) => r.status !== "대기")
    expect(settled.length).toBeGreaterThan(0)
    expect(settled.every((r) => r.scheduledDate < today)).toBe(true)
  })
})
