import { describe, it, expect } from "vitest"
import { MOCK_TRANSFER_HISTORY } from "@/entities/transfer"
import { MOCK_ACCESS_STATUS } from "@/entities/dashboard"
import { recentPeriod } from "@/shared/config/query-period"
import { getToday } from "@/shared/config/clock"
import { addDays } from "@/shared/lib/date"

const dates = () => MOCK_TRANSFER_HISTORY.map((r) => r.datetime.slice(0, 10))

describe("MOCK_TRANSFER_HISTORY", () => {
  it("최신 건이 D-7 이내다", () => {
    // 고정 날짜를 박으면 이 단언이 일주일 뒤부터 깨진다.
    const newest = dates().reduce((a, d) => (d > a ? d : a), "")
    expect(newest >= addDays(getToday(), -7)).toBe(true)
  })

  it("거래번호 접두 8자리가 이체일시와 같은 날짜다", () => {
    // txId는 `yyyyMMdd` + 일련번호다. 날짜만 상대값으로 바꾸면 D-04 그리드에서
    // 거래번호와 이체일시가 서로 다른 날을 가리킨다.
    const mismatched = MOCK_TRANSFER_HISTORY.filter(
      (r) => r.txId.slice(0, 8) !== r.datetime.slice(0, 10).replaceAll("-", ""),
    )
    expect(mismatched).toEqual([])
  })

  it("대시보드 '최근 거래일시'가 최신 이체 건과 같다", () => {
    // 같은 거래를 두 mock이 각자 들고 있어서, 한쪽 오프셋만 고치면 대시보드와
    // D-04가 서로 다른 날을 가리킨다.
    const newest = MOCK_TRANSFER_HISTORY.reduce(
      (a, r) => (r.datetime > a ? r.datetime : a),
      "",
    )
    expect(MOCK_ACCESS_STATUS.lastTransaction).toBe(newest)
  })

  it("기본 조회기간(POL-021, 1개월)에 최소 3건이 들어온다", () => {
    const { start, end } = recentPeriod()
    const visible = dates().filter((d) => d >= start && d <= end)
    expect(visible.length).toBeGreaterThanOrEqual(3)
  })
})
