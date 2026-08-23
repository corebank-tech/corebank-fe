/**
 * 실패 횟수를 누적하는 정책(로그인 REQ-AUTH-024, 계좌 실명확인 REQ-AUTH-006 등)이
 * 공통으로 쓰는 오류 응답 data 모양. 필드가 없는 응답(잠금·대상 없음 등)도 있어 각각 optional이다.
 */
export type AttemptFailureData = {
  errorCount?: number
  remainingAttempts?: number
}

export const getAttemptFailureData = (
  data: unknown,
): AttemptFailureData | null => {
  if (typeof data !== "object" || data === null) return null

  const value = data as Record<string, unknown>

  return {
    errorCount:
      typeof value.errorCount === "number" ? value.errorCount : undefined,
    remainingAttempts:
      typeof value.remainingAttempts === "number"
        ? value.remainingAttempts
        : undefined,
  }
}
