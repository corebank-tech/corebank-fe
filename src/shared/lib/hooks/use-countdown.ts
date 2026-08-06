import * as React from "react"

/**
 * mm:ss 카운트다운 표시용 훅. OTP·이메일 인증번호처럼 "코드가 발급된 동안만
 * 매초 줄어드는" 타이머를 다루는 4곳(OtpModal, 회원가입 이메일 인증, 비밀번호
 * 재설정, 마이페이지 이메일 인증)이 공유한다.
 *
 * `active`는 호출부가 "지금 째깍여야 하는가"를 결정한다(예: 모달이 열려 있고
 * 코드가 발급된 상태). 만료(`remaining <= 0`) 판정은 호출부가 `active`와 함께
 * 계산한다 — 발급 전에는 `remaining`이 초기값을 유지하므로 만료로 보면 안 되기 때문이다.
 */
export function useCountdown(seconds: number, active: boolean) {
  const [remaining, setRemaining] = React.useState(seconds)

  React.useEffect(() => {
    if (!active || remaining <= 0) return
    const id = window.setInterval(() => {
      setRemaining((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [active, remaining])

  const reset = React.useCallback(
    (next: number = seconds) => setRemaining(next),
    [seconds],
  )

  return { remaining, reset }
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}
