/**
 * 화면 전반이 "지금"으로 취급하는 단일 기준시각. 화면마다 다른 값을 쓰면
 * 기준일시·조회 가능 기간 등이 화면 간에 어긋난다 — 새 mock 데이터를 추가할
 * 때도 이 값을 기준으로 삼는다.
 *
 * 상수가 아니라 함수인 이유: 모듈 로드 시점에 한 번만 평가하면 자정을 넘겨
 * 열어둔 탭에서 어제 날짜가 그대로 남아, 실제 시각으로 검증하는 백엔드와
 * 어긋난다(예: 예약이체 예정일 SCD0001).
 */
const pad = (n: number): string => String(n).padStart(2, "0")

const toISODate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** 로컬 기준 오늘 날짜(`yyyy-MM-dd`). */
export const getToday = (): string => toISODate(new Date())

/** 로컬 기준 현재 시각(`yyyy-MM-ddTHH:mm:ss`). */
export const getNow = (): string => {
  const d = new Date()
  return `${toISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
