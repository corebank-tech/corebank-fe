import { daysBetween } from "@/shared/lib/date"

export type PeriodRangeCheck = {
  /** 시작일과 종료일 중 하나라도 비어 있다. */
  incomplete: boolean
  reversed: boolean
  overLimit: boolean
}

/**
 * 조회기간 입력을 검사한다(REQ-INQR-010).
 *
 * 한도는 두 가지를 함께 본다. 요구사항이 열마다 다른 기준을 쓰기 때문이다 —
 * 본문과 POL-021 적용기준 열은 "시작일 기준"(조회 시작일이 조회 시점으로부터 1년 이내)이고,
 * 인수기준 열은 "1년 초과 **기간**"으로 폭을 말한다. 한쪽만 보면 다른 쪽이 뚫린다.
 *
 * - 시작일만 보면 `2026-08-01 ~ 2028-08-01`처럼 종료일을 미래로 벌린 창이 통과한다.
 * - 폭만 보면 `2019-01-01 ~ 2019-12-31`처럼 통째로 오래된 창이 통과한다.
 *
 * 빈 문자열은 `daysBetween`이 NaN을 내고 NaN은 어떤 비교에도 false라 두 검사를 그냥
 * 통과한다. 조용히 빈 목록이 나오므로 `incomplete`로 따로 구분한다.
 */
export function checkPeriodRange(
  start: string,
  end: string,
  today: string,
  maxRangeDays: number,
): PeriodRangeCheck {
  if (!start || !end) {
    return { incomplete: true, reversed: false, overLimit: false }
  }
  const span = daysBetween(start, end)
  return {
    incomplete: false,
    reversed: span < 0,
    overLimit: daysBetween(start, today) > maxRangeDays || span > maxRangeDays,
  }
}
