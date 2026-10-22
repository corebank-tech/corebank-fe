/** 서버 `CorrelationIdFilter` 가 버리는 패턴 — 계좌번호·연락처가 로그로 흘러나가는 것을 막는다. */
const LONG_DIGIT_RUN = /\d{11,}/

/**
 * 요청 추적용 correlation id. 서버가 버리는 값을 보내면 서버가 자기 값을 써서
 * 화면이 들고 있는 id 와 서버 로그의 id 가 갈린다 — 같은 규칙으로 걸러낸다.
 */
export const createCorrelationId = (): string => {
  let candidate = crypto.randomUUID()
  while (LONG_DIGIT_RUN.test(candidate)) {
    candidate = crypto.randomUUID()
  }
  return candidate
}
