import { describe, expect, it } from "vitest"
import { latestFdsCallRecord } from "@/entities/fds/model/fds-call-record"

describe("latestFdsCallRecord", () => {
  it("응답 배열 순서와 무관하게 recordedAt이 가장 최신인 기록을 고른다", () => {
    const latest = latestFdsCallRecord([
      {
        callRecordId: 2,
        callResult: "CUSTOMER_DENIED",
        recordedAt: "2026-11-16T09:00:00+09:00",
      },
      {
        callRecordId: 1,
        callResult: "CUSTOMER_CONFIRMED",
        recordedAt: "2026-11-16T10:00:00+09:00",
      },
    ])

    expect(latest?.callRecordId).toBe(1)
    expect(latest?.callResult).toBe("CUSTOMER_CONFIRMED")
  })
})
