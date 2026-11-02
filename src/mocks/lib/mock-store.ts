/**
 * MSW 목의 상태 저장소.
 *
 * 핸들러는 페이지 컨텍스트에서 돌아 새로고침하면 모듈 상태가 사라진다. 가입·OTP·
 * 계좌비밀번호처럼 요청을 넘어 이어지는 상태는 sessionStorage 에 둔다(auth.ts 의
 * 세션 저장과 같은 이유). 탭을 닫으면 사라져 e2e 테스트 간 격리도 유지된다.
 */
const PREFIX = "corebank-mock:"

export const readStore = <T>(key: string, fallback: T): T => {
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export const writeStore = <T>(key: string, value: T): void => {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // 저장소를 못 쓰는 환경이면 상태 없이 동작한다.
  }
}

/** 이름별 일련번호. 1부터 시작한다. */
export const nextSequence = (name: string): number => {
  const next = readStore<number>(`seq:${name}`, 0) + 1
  writeStore(`seq:${name}`, next)
  return next
}

const pad = (n: number): string => String(n).padStart(2, "0")

/** 서버 LocalDateTime 직렬화(`yyyy-MM-ddTHH:mm:ss`)와 같은 모양. 브라우저 로컬 시각 기준. */
export const toLocalDateTime = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
  `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
