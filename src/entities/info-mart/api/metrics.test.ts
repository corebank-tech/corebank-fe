import { describe, expect, it } from "vitest"
import {
  toDepositBalanceMetric,
  toMonthlySubscriptionsMetric,
} from "@/entities/info-mart/api/metrics"

describe("toDepositBalanceMetric", () => {
  it("목록의 마지막 행이 아니라 asOf 날짜의 행을 고른다", () => {
    // 서버 정렬을 가정하지 않는다. asOf 보다 앞선 날이 뒤에 와도 asOf 행을 쓴다.
    const metric = toDepositBalanceMetric({
      asOf: "2026-10-28",
      items: [
        { baseDate: "2026-10-28", totalBalance: 300 },
        { baseDate: "2026-10-27", totalBalance: 200 },
      ],
    })
    expect(metric).toEqual({ kind: "loaded", asOf: "2026-10-28", value: 300 })
  })

  it("적재 이력이 없으면(asOf null) 값을 내지 않는다", () => {
    expect(toDepositBalanceMetric({ asOf: null, items: [] })).toEqual({
      kind: "notLoaded",
    })
  })

  it("asOf 날짜의 행이 없으면 다른 날 값으로 대신하지 않는다", () => {
    const metric = toDepositBalanceMetric({
      asOf: "2026-10-28",
      items: [{ baseDate: "2026-10-27", totalBalance: 200 }],
    })
    expect(metric).toEqual({ kind: "notLoaded" })
  })
})

describe("toMonthlySubscriptionsMetric", () => {
  it("서버가 고른 달과 건수를 싣는다", () => {
    const metric = toMonthlySubscriptionsMetric({
      asOf: "2026-10-31",
      month: "2026-10",
      subscribedCount: 120,
      closedCount: 0,
      items: [],
    })
    expect(metric).toEqual({
      kind: "loaded",
      asOf: "2026-10-31",
      value: { month: "2026-10", subscribedCount: 120, closedCount: 0 },
    })
  })

  it("적재 이력이 없으면 건수가 와도 값을 내지 않는다", () => {
    const metric = toMonthlySubscriptionsMetric({
      asOf: null,
      month: "2026-10",
      subscribedCount: 0,
      closedCount: 0,
      items: [],
    })
    expect(metric).toEqual({ kind: "notLoaded" })
  })
})
