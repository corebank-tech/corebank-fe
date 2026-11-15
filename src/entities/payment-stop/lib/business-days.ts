import { addDays, parseISO } from "@/shared/lib/date"

/**
 * 영업일 셈(D12). 화면은 주말만 뺀다.
 *
 * 공휴일 달력은 서버(`BusinessDateProvider`)에만 있다. 기한 날짜와 경보 여부는 서버가 공휴일을
 * 넣어 계산해 주고, 화면의 남은 영업일 수는 그 날짜까지 평일을 센 안내값이다. 그래서 경보 색은
 * 이 셈이 아니라 서버 `deadlineAlert` 로 정한다.
 */

const isWeekend = (iso: string) => {
  const day = parseISO(iso).getDay()
  return day === 0 || day === 6
}

/** `from` 다음 날부터 `days` 번째 평일. 서버 `nextBusinessDay` 반복과 같은 모양이다. */
export const addBusinessDays = (from: string, days: number): string => {
  let date = from
  let left = days
  while (left > 0) {
    date = addDays(date, 1)
    if (!isWeekend(date)) left -= 1
  }
  return date
}

/**
 * `today` 에서 `deadline` 까지 남은 평일 수. 당일이 기한이면 0, 지났으면 지난 평일 수를
 * 음수로 준다.
 */
export const businessDaysUntil = (today: string, deadline: string): number => {
  if (today === deadline) return 0
  const forward = today < deadline
  const [start, end] = forward ? [today, deadline] : [deadline, today]
  let count = 0
  let date = start
  while (date < end) {
    date = addDays(date, 1)
    if (!isWeekend(date)) count += 1
  }
  return forward ? count : -count
}
