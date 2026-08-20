/**
 * 화면 전반이 "지금"으로 취급하는 단일 기준시각.
 * 실 API 연동 전에는 고정값을 썼지만, 백엔드가 실제 시각으로 유효성을 검증하므로
 * (예: SCD0001 예약일자 검증) 이제 실제 현재 시각을 쓴다. 화면마다 다른 값을 쓰면
 * 기준일시·조회 가능 기간 등이 화면 간에 어긋난다 — 새 mock 데이터를 추가할 때도
 * 이 값을 기준으로 삼는다.
 */
const pad = (n: number): string => String(n).padStart(2, "0")

const now = new Date()
const y = now.getFullYear()
const mo = pad(now.getMonth() + 1)
const d = pad(now.getDate())

export const MOCK_NOW = `${y}-${mo}-${d}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
export const MOCK_TODAY = `${y}-${mo}-${d}`
