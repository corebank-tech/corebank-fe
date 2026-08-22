import { afterEach, describe, expect, it, vi } from "vitest"
import { MOCK_AUTO_TRANSFERS, type AutoTransferRow } from "@/entities/transfer"
import { getToday } from "@/shared/config/clock"

const dayOf = (iso: string): number => Number(iso.slice(8, 10))

/**
 * 자동이체는 시작일·종료일·다음 실행일·이체지정일이 한 묶음으로 움직인다.
 * 상대값 오프셋을 하나만 고쳐도 짝이 어긋나므로, 기준일을 옮겨가며 같은
 * 불변식을 다시 확인한다.
 */
const expectDatesConsistent = (
  rows: readonly AutoTransferRow[],
  today: string,
) => {
  for (const row of rows) {
    expect({
      id: row.id,
      start: dayOf(row.startDate),
      end: dayOf(row.endDate),
      next: row.nextExecDate ? dayOf(row.nextExecDate) : row.dayOfMonth,
    }).toEqual({
      id: row.id,
      start: row.dayOfMonth,
      end: row.dayOfMonth,
      next: row.dayOfMonth,
    })
    expect({ id: row.id, ordered: row.startDate < row.endDate }).toEqual({
      id: row.id,
      ordered: true,
    })
  }

  const normal = rows.filter((r) => r.status === "정상")
  expect(normal.length).toBeGreaterThan(0)
  for (const row of normal) {
    // 종료일이 지난 건은 '종료'여야 하고, 다음 실행일은 그 안에 있어야 한다.
    expect({
      id: row.id,
      next: row.nextExecDate,
      inRange:
        row.nextExecDate != null &&
        row.nextExecDate > today &&
        row.nextExecDate <= row.endDate,
    }).toEqual({ id: row.id, next: row.nextExecDate, inRange: true })
  }

  const ended = rows.filter((r) => r.status === "종료")
  expect(ended.length).toBeGreaterThan(0)
  for (const row of ended) {
    expect({ id: row.id, past: row.endDate < today }).toEqual({
      id: row.id,
      past: true,
    })
  }

  // REQ-AUTO-011. cancelable은 서버 판정값이라 목업에서는 손으로 적는데,
  // 다음 실행일이 상대값이 된 뒤로는 날짜와 어긋날 수 있다.
  const mismatched = rows.filter(
    (r) => r.cancelable !== (r.status === "정상" && r.nextExecDate !== today),
  )
  expect(mismatched).toEqual([])
}

describe("MOCK_AUTO_TRANSFERS", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("이체지정일과 세 날짜의 일이 맞물린다", () => {
    expectDatesConsistent(MOCK_AUTO_TRANSFERS, getToday())
  })

  it("이체지정일이 1~28이다", () => {
    // 29~31은 짧은 달에서 말일로 보정돼 이체지정일과 벌어진다.
    const outOfRange = MOCK_AUTO_TRANSFERS.filter(
      (r) => r.dayOfMonth < 1 || r.dayOfMonth > 28,
    )
    expect(outOfRange).toEqual([])
  })

  it("'정상'이 아닌 건에는 다음 실행일이 없다", () => {
    const withNext = MOCK_AUTO_TRANSFERS.filter(
      (r) => r.status !== "정상" && r.nextExecDate != null,
    )
    expect(withNext).toEqual([])
  })

  it("기준일을 12개월 옮겨도 같은 정합이 유지된다", async () => {
    // 기준일의 일자도 함께 돌린다 — 이체지정일과 같은 날에 들어오면 다음 실행일이
    // 오늘이 되어 해지 가능 여부가 뒤집히고, 2월처럼 짧은 달에서는 말일 보정이 걸린다.
    const DAYS_OF_MONTH = [1, 5, 15, 21, 28]

    // 목업 날짜는 모듈 평가 시점에 계산되므로, 기준일을 바꾼 뒤 다시 불러온다.
    for (let monthOffset = 1; monthOffset <= 12; monthOffset += 1) {
      vi.useFakeTimers()
      const day = DAYS_OF_MONTH[monthOffset % DAYS_OF_MONTH.length]
      vi.setSystemTime(new Date(2026, 7 + monthOffset, day, 9, 0, 0))
      vi.resetModules()

      const { MOCK_AUTO_TRANSFERS: rows } =
        await import("@/entities/transfer/api/g04-auto-transfers")
      const { getToday: todayAt } = await import("@/shared/config/clock")
      expectDatesConsistent(rows, todayAt())

      vi.useRealTimers()
    }
  })
})
