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
import {
  useIssue,
  useVerify,
} from "@/shared/api/generated/otp-controller/otp-controller"
import type {
  IssueOtpRequestTransactionData,
  IssueOtpRequestTransactionType,
  IssueOtpResponse,
  VerifyOtpResponse,
} from "@/shared/api/generated/model"
import { ApiError } from "@/shared/api/api-error"

type OtpModalProps = {
  open: boolean
  onClose: () => void
  /**
   * 검증 성공 시 호출된다. 실거래 모드(transactionType 지정)에서는 서버가 발급한
   * otpAuthToken을, mock 모드(미지정)에서는 로컬 발급 코드값을 그대로 돌려준다.
   */
  onConfirm: (value: string) => void
  title?: React.ReactNode
  /** One-line guidance shown above the issue button. */
  guide?: React.ReactNode
  /**
   * 지정하면 실제 POST /otp/issue·/otp/verify를 호출해 서버가 검증한
   * otpAuthToken을 발급받는다. 미지정 시 기존처럼 로컬 mock으로 동작한다 —
   * 아직 이 모달만 붙어 있고 업무 API에 실거래 토큰 연동이 안 된 화면 대비.
   */
  transactionType?: IssueOtpRequestTransactionType
  /** transactionType과 함께 지정한다. OTP 발급·검증 시점에 서버가 기록해 두는
   * 거래 내용이며, 최종 업무 요청과 같은 값을 담아야 한다. */
  transactionData?: IssueOtpRequestTransactionData
}

const generateOtp = (): string => {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/** 재발급이 필요한 서버 오류 코드. 코드 불일치(OTP0001)만 재입력을 허용한다. */
const REISSUE_REQUIRED_CODES = new Set([
  "OTP0103", // 시도 횟수 초과
  "OTP0104", // 만료
  "OTP0201", // 요청을 찾을 수 없음(이미 소비 포함)
])

/**
 * A-93 OTP 인증 모달. transactionType이 지정되면 실제 서버 OTP를 발급·검증하고,
 * 미지정 시 화면에 표시되는 로컬 mock 코드로 동작한다(두 모드 모두 180초 카운트다운).
 */
export const OtpModal = ({
  open,
  onClose,
  onConfirm,
  title = "OTP 인증",
  guide = "OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하세요.",
  transactionType,
  transactionData,
}: OtpModalProps) => {
  const issueMutation = useIssue()
  const verifyMutation = useVerify()

  const [otpRequestId, setOtpRequestId] = React.useState<string | null>(null)
  const [issued, setIssued] = React.useState<string | null>(null)
  const { remaining, reset: resetCountdown } = useCountdown(
    OTP_TTL_SECONDS,
    open && issued != null,
  )
  const [value, setValue] = React.useState("")
  const [attempts, setAttempts] = React.useState(0)
  const [locked, setLocked] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const expired = issued != null && remaining <= 0
  const attemptsExhausted =
    otpRequestId != null ? locked : attempts >= MAX_ATTEMPTS

  const reset = React.useCallback(() => {
    setOtpRequestId(null)
    setIssued(null)
    resetCountdown()
    setValue("")
    setAttempts(0)
    setLocked(false)
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

  const issue = async () => {
    setError(null)
    if (transactionType != null && transactionData != null) {
      try {
        const response = (await issueMutation.mutateAsync({
          data: { transactionType, transactionData },
        })) as unknown as IssueOtpResponse
        setOtpRequestId(response.otpRequestId ?? null)
        setIssued(response.otpCode ?? null)
        resetCountdown(response.expiresIn ?? OTP_TTL_SECONDS)
        setValue("")
        setLocked(false)
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "OTP 발급에 실패했습니다.")
      }
      return
    }
    setIssued(generateOtp())
    resetCountdown()
    setValue("")
  }

  const confirm = async () => {
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

    if (otpRequestId != null) {
      try {
        const response = (await verifyMutation.mutateAsync({
          data: { otpRequestId, otpCode: value },
        })) as unknown as VerifyOtpResponse
        if (response.otpAuthToken) {
          onConfirm(response.otpAuthToken)
          return
        }
        setError("OTP 인증에 실패했습니다.")
      } catch (e) {
        if (e instanceof ApiError) {
          setError(e.message)
          if (REISSUE_REQUIRED_CODES.has(e.code)) {
            setLocked(true)
          } else {
            setValue("")
          }
        } else {
          setError("OTP 확인 중 오류가 발생했습니다.")
        }
      }
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
            disabled={
              attemptsExhausted
                ? false
                : issued == null || expired || verifyMutation.isPending
            }
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
            <Button
              variant="outline"
              size="sm"
              onClick={issue}
              disabled={issueMutation.isPending}
            >
              OTP 발급
            </Button>
          </>
        ) : (
          <>
            <span
              className={cn(
                "text-page font-bold tracking-2",
                expired ? "text-ink-faint line-through" : "text-primary",
              )}
              aria-label="발급된 OTP 번호"
            >
              {issued}
            </span>
            <div className="flex flex-col items-end gap-1">
              <span
                className={cn(
                  "text-base font-bold",
                  expired ? "text-ink-faint" : "text-ink",
                )}
              >
                {formatClock(remaining)}
              </span>
              {expired && !attemptsExhausted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={issue}
                  disabled={issueMutation.isPending}
                >
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
        disabled={
          issued == null ||
          expired ||
          attemptsExhausted ||
          verifyMutation.isPending
        }
        onChange={(e) => {
          setValue(e.target.value.replace(/\D/g, "").slice(0, 6))
          if (error) setError(null)
        }}
        className="text-center text-lg tracking-4"
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
