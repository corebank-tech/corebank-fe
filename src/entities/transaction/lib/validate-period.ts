import { daysBetween } from "@/shared/lib/date"

export type PeriodRangeCheck = {
  reversed: boolean
  overLimit: boolean
}

/** 조회기간이 역순이거나 maxRangeDays를 넘는지 검사한다(REQ-INQR-009). */
export function checkPeriodRange(
  start: string,
  end: string,
  maxRangeDays: number,
): PeriodRangeCheck {
  const span = daysBetween(start, end)
  return {
    reversed: span < 0,
    overLimit: span > maxRangeDays,
  }
}
