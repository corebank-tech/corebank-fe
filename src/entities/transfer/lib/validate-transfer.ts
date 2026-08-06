import { addDays, addMonths, daysBetween } from "@/shared/lib/date"

export type AmountLimitCheck = {
  /** showDailyLimit이 true면 1회·1일 한도 중 작은 값, 아니면 1회 한도. */
  limit: number
  /** limit 초과 여부. */
  overLimit: boolean
  /** 1회 이체한도(perTransferLimit) 자체를 초과했는지 여부 — 에러 메시지 분기에 쓴다. */
  overPerTransferLimit: boolean
}

/**
 * 이체금액이 1회·1일 한도를 넘는지 검사한다. 예약이체·자동이체는 등록 시점에
 * 1회 한도만 검증하고 1일 한도는 실행 시점에 검증하므로 showDailyLimit을
 * false로 끈다(REQ-RSV-006, REQ-AUTO-006).
 */
export function checkAmountLimit(
  amount: number | null,
  perTransferLimit: number,
  dailyRemaining: number,
  showDailyLimit: boolean,
): AmountLimitCheck {
  const limit = showDailyLimit
    ? Math.min(perTransferLimit, dailyRemaining)
    : perTransferLimit
  return {
    limit,
    overLimit: amount != null && amount > limit,
    overPerTransferLimit: amount != null && amount > perTransferLimit,
  }
}

export type DateRangeCheck = {
  min: string
  max: string
  outOfRange: boolean
}

/** 예약일이 오늘 기준 D+minDays ~ D+maxDays 범위인지 검사한다(POL-018·POL-035). */
export function checkReservationDateRange(
  today: string,
  value: string,
  minDays: number,
  maxDays: number,
): DateRangeCheck {
  const min = addDays(today, minDays)
  const max = addDays(today, maxDays)
  const span = value ? daysBetween(today, value) : null
  const outOfRange = span != null && (span < minDays || span > maxDays)
  return { min, max, outOfRange }
}

/** 이체종료일이 시작일 이후 ~ 시작일+maxMonths 범위인지 검사한다(POL-035). */
export function checkTransferEndDateRange(
  startDate: string,
  value: string,
  maxMonths: number,
): DateRangeCheck {
  const min = addDays(startDate, 1)
  const max = addMonths(startDate, maxMonths)
  const afterStart = value ? daysBetween(startDate, value) > 0 : true
  const withinMax = value
    ? daysBetween(startDate, value) <= daysBetween(startDate, max)
    : true
  const outOfRange = value !== "" && (!afterStart || !withinMax)
  return { min, max, outOfRange }
}
