import {
  addDays as addDaysFns,
  addMonths as addMonthsFns,
  differenceInCalendarDays,
  format,
  parseISO as parseISOFns,
} from "date-fns"

/** "yyyy-MM-dd" -> 로컬 자정 Date. 네이티브 `new Date(iso)`와 달리 UTC 오프바이원이 없다. */
export function parseISO(iso: string): Date {
  return parseISOFns(iso)
}

export function toISO(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

export function addDays(iso: string, days: number): string {
  return toISO(addDaysFns(parseISO(iso), days))
}

export function daysBetween(startISO: string, endISO: string): number {
  return differenceInCalendarDays(parseISO(endISO), parseISO(startISO))
}

/** iso 일자에 months개월을 더한다. 대상 월에 없는 일자는 그 달의 말일로 보정한다 (POL-034와 동일한 보정 규칙). */
export function addMonths(iso: string, months: number): string {
  return toISO(addMonthsFns(parseISO(iso), months))
}
