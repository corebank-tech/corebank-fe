import * as React from "react"
import { Modal } from "@/shared/ui/modal"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { cn } from "@/shared/lib/utils"
import { formatClock, useCountdown } from "@/shared/lib/hooks/use-countdown"
import {
  OTP_MAX_ATTEMPTS as MAX_ATTEMPTS,
  OTP_TTL_SECONDS,
} from "@/shared/config/policy"

type OtpModalProps = {
  open: boolean
  onClose: () => void
  /** Called with the entered code when verification succeeds. */
  onConfirm: (code: string) => void
  title?: React.ReactNode
  /** One-line guidance shown above the issue button. */
  guide?: React.ReactNode
}

const generateOtp = (): string => {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/**
 * A-93 OTP 인증 모달 (Mock). Issues a 6-digit code that is displayed on screen
 * (unlike a real token) with a 180-second countdown. The user re-enters the
 * code to confirm; mismatches are reported inline with an attempt counter.
 */
export const OtpModal = ({
  open,
  onClose,
  onConfirm,
  title = "OTP 인증",
  guide = "OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하세요.",
}: OtpModalProps) => {
  const [issued, setIssued] = React.useState<string | null>(null)
  const { remaining, reset: resetCountdown } = useCountdown(
    OTP_TTL_SECONDS,
    open && issued != null,
  )
  const [value, setValue] = React.useState("")
  const [attempts, setAttempts] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)

  const expired = issued != null && remaining <= 0

  const reset = React.useCallback(() => {
    setIssued(null)
    resetCountdown()
    setValue("")
    setAttempts(0)
    setError(null)
  }, [resetCountdown])

  // 닫힐 때 내부 상태를 지우고, 만료 순간(확인 클릭 전에도, REQ-OTP-005) 즉시
  // 안내를 띄운다. effect 대신 렌더 중 상태 조정 패턴(React 공식 가이드
  // "Adjusting state when a prop changes")을 쓴다.
  const [prevOpen, setPrevOpen] = React.useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (!open) reset()
  }

  const [prevExpired, setPrevExpired] = React.useState(expired)
  if (expired !== prevExpired) {
    setPrevExpired(expired)
    if (expired) setError("입력 시간이 초과되었습니다. OTP를 재발급해 주세요.")
  }

  const issue = () => {
    setIssued(generateOtp())
    resetCountdown()
    setValue("")
    setError(null)
  }

  const confirm = () => {
    if (issued == null) {
      setError("OTP를 먼저 발급하세요.")
      return
    }
    if (expired) {
      setError("입력 시간이 초과되었습니다. OTP를 재발급해 주세요.")
      return
    }
    if (value.length !== 6) {
      setError("OTP 6자리를 모두 입력하세요.")
      return
    }
    if (value !== issued) {
      const next = attempts + 1
      setAttempts(next)
      setValue("")
      setError(`OTP 번호가 올바르지 않습니다. (${next}/${MAX_ATTEMPTS}회)`)
      return
    }
    onConfirm(value)
  }

  const attemptsExhausted = attempts >= MAX_ATTEMPTS

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button
            variant="secondary"
            size="lg"
            className="min-w-30"
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="min-w-30"
            onClick={attemptsExhausted ? onClose : confirm}
            disabled={attemptsExhausted ? false : issued == null || expired}
          >
            확인
          </Button>
        </>
      }
    >
      <p className="mb-4 text-base leading-relaxed text-ink-muted">{guide}</p>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3">
        {issued == null ? (
          <>
            <span className="text-base text-ink-muted">
              발급된 OTP가 없습니다.
            </span>
            <Button variant="outline" size="sm" onClick={issue}>
              OTP 발급
            </Button>
          </>
        ) : (
          <>
            <span
              className={cn(
                "text-page font-bold tracking-2 tabular-nums",
                expired ? "text-ink-faint line-through" : "text-primary",
              )}
              aria-label="발급된 OTP 번호"
            >
              {issued}
            </span>
            <div className="flex flex-col items-end gap-1">
              <span
                className={cn(
                  "text-base font-bold tabular-nums",
                  expired ? "text-ink-faint" : "text-ink",
                )}
              >
                {formatClock(remaining)}
              </span>
              {expired && !attemptsExhausted && (
                <Button variant="outline" size="sm" onClick={issue}>
                  재발급
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      <Input
        inputMode="numeric"
        maxLength={6}
        placeholder="OTP 6자리"
        value={value}
        invalid={error != null}
        disabled={issued == null || expired || attemptsExhausted}
        onChange={(e) => {
          setValue(e.target.value.replace(/\D/g, "").slice(0, 6))
          if (error) setError(null)
        }}
        className="text-center text-lg tracking-4 tabular-nums"
        aria-label="OTP 입력"
      />

      {error && (
        <p role="alert" className="mt-2 text-base font-bold text-danger">
          {error}
        </p>
      )}
      {attemptsExhausted && (
        <p className="mt-2 text-base text-ink-muted">
          입력 횟수를 초과했습니다. 처음부터 다시 진행하세요.
        </p>
      )}
    </Modal>
  )
}
