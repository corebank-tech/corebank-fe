/**
 * 상품가입 도메인 계산. Phase 1 이자계산은 서버 미구현이며(POL-030),
 * 여기서 산출하는 값은 화면 참고값 전용이다.
 */

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate()
}

/** REQ-PRDT-014: 가입일 + 개월 수. 존재하지 않는 날짜(예: 1/31 + 1개월)는 해당 월의 말일로 보정한다. */
export function addMonthsWithEomCorrection(
  iso: string,
  months: number,
): string {
  const [y, m, d] = iso.split("-").map(Number)
  const total = m - 1 + months
  const targetYear = y + Math.floor(total / 12)
  const targetMonthIndex = ((total % 12) + 12) % 12
  const day = Math.min(d, daysInMonth(targetYear, targetMonthIndex))
  const mm = String(targetMonthIndex + 1).padStart(2, "0")
  const dd = String(day).padStart(2, "0")
  return `${targetYear}-${mm}-${dd}`
}

/**
 * REQ-PRDT-009: 예상 만기 원리금(세전 단리) 참고값.
 * 정기예금은 가입금액을, 정기적금은 월납입금액 × 가입기간의 누적 납입액을 원금 기준으로 삼는다.
 */
export function estimateMaturityAmount(params: {
  category: "정기예금" | "정기적금"
  amount: number
  termMonths: number
  annualRatePercent: number
}): number {
  const { category, amount, termMonths, annualRatePercent } = params
  const principalBase = category === "정기적금" ? amount * termMonths : amount
  const interest = principalBase * (annualRatePercent / 100) * (termMonths / 12)
  return Math.trunc(principalBase + interest)
}
