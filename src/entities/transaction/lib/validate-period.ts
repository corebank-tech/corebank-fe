import { daysBetween } from "@/shared/lib/date"

export type PeriodRangeCheck = {
  reversed: boolean
  overLimit: boolean
}

/**
 * 조회기간이 역순이거나, 시작일이 조회 시점으로부터 maxRangeDays를 넘어 과거인지 검사한다.
 *
 * 한도는 **기간 폭이 아니라 시작일 기준**이다 — POL-021의 적용기준 열이 "시작일 기준"이고
 * REQ-INQR-010도 "조회 시작일은 조회 시점으로부터 1년 이내"로 규정한다. 폭으로 재면
 * 2019-01-01 ~ 2019-12-31 같은 창이 통과한다.
 */
export function checkPeriodRange(
  start: string,
  end: string,
  today: string,
  maxRangeDays: number,
): PeriodRangeCheck {
  return {
    reversed: daysBetween(start, end) < 0,
    overLimit: daysBetween(start, today) > maxRangeDays,
  }
}
