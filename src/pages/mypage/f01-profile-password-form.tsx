import * as React from "react"
import { useNavigate } from "react-router"
import {
  useCustomerLoginPasswordChangeMutation,
  type CustomerInfo,
} from "@/entities/customer"
import { useSession } from "@/features/session"
import { toErrorMessage } from "@/shared/api/api-error"
import { Button } from "@/shared/ui/button"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { ErrorDialog } from "@/shared/ui/error-dialog"
import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import { Input } from "@/shared/ui/input"

const PASSWORD_MIN = 8
const PASSWORD_MAX = 15

/**
 * 서버 정책과 동일한 형식 규칙을 화면에서 선검증한다.
 * 고객정보 조회의 userId는 마스킹된 값이므로 아이디 포함 여부는 서버가 최종 검증한다.
 */
const validateLoginPassword = (password: string): string | null => {
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return `비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자로 입력하세요.`
  }

  if (!/[A-Za-z]/.test(password)) {
    return "비밀번호에 영문자를 1자 이상 포함하세요."
  }

  if (!/[0-9]/.test(password)) {
    return "비밀번호에 숫자를 1자 이상 포함하세요."
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    return "비밀번호에 특수문자를 1자 이상 포함하세요."
  }

  if (/\s/.test(password)) {
    return "비밀번호에는 공백을 사용할 수 없습니다."
  }

  if (/(.)\1{3,}/.test(password)) {
    return "동일한 문자를 4자리 이상 연속으로 사용할 수 없습니다."
  }

  for (let index = 0; index <= password.length - 4; index++) {
    const passwordChunk = password.slice(index, index + 4)

    if (!/^\d{4}$/.test(passwordChunk)) continue

    const digits = passwordChunk.split("").map(Number)

    const isAscending = digits.every(
      (digit, digitIndex) =>
        digitIndex === 0 || digit === digits[digitIndex - 1] + 1,
    )

    const isDescending = digits.every(
      (digit, digitIndex) =>
        digitIndex === 0 || digit === digits[digitIndex - 1] - 1,
    )

    if (isAscending || isDescending) {
      return "연속으로 증가·감소하는 숫자를 4자리 이상 사용할 수 없습니다."
    }
  }

  return null
}

type Props = {
  profile: CustomerInfo
}

export const F01ProfilePasswordForm = ({ profile }: Props) => {
  const navigate = useNavigate()
  const { logout } = useSession()
  const changePasswordMutation = useCustomerLoginPasswordChangeMutation()

  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [passwordError, setPasswordError] = React.useState<string | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false)
  const [errorDialogMessages, setErrorDialogMessages] = React.useState<
    string[] | null
  >(null)

  const clearPasswords = () => {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }

  const handleReset = () => {
    clearPasswords()
    setPasswordError(null)
  }

  const handleSubmit = () => {
    if (currentPassword.length === 0) {
      setPasswordError("현재 비밀번호를 입력하세요.")
      return
    }

    const ruleError = validateLoginPassword(newPassword)

    if (ruleError) {
      setPasswordError(ruleError)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "신규 비밀번호와 신규 비밀번호 확인이 일치하지 않습니다.",
      )
      return
    }

    setPasswordError(null)
    setIsConfirmOpen(true)
  }

  const handleConfirm = async () => {
    if (changePasswordMutation.isPending) return

    setIsConfirmOpen(false)
    setErrorDialogMessages(null)

    try {
      await changePasswordMutation.mutateAsync({
        data: {
          currentPassword,
          newPassword,
          newPasswordConfirm: confirmPassword,
        },
      })

      // 서버는 비밀번호 변경 성공 후 현재 세션을 포함한 고객의 모든 세션을
      // 무효화한다. 클라이언트 캐시도 정리한 뒤 새 비밀번호로 재로그인한다.
      try {
        await logout()
      } catch {
        // 비밀번호 변경으로 서버 세션이 이미 만료된 정상 경로일 수 있다.
      }

      navigate("/", { replace: true })
    } catch (error) {
      const message = toErrorMessage(error)

      if (message != null) {
        setErrorDialogMessages([message])
      }
    } finally {
      clearPasswords()
      setPasswordError(null)
      changePasswordMutation.reset()
    }
  }

  return (
    <>
      <ConfirmDialog
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => void handleConfirm()}
        title="로그인 비밀번호 변경"
        messages={[
          "현재 비밀번호를 확인한 뒤 신규 비밀번호로 변경합니다.",
          "변경이 완료되면 모든 로그인 세션이 종료되며 다시 로그인해야 합니다.",
        ]}
        confirmLabel="변경하기"
        items={[{ label: "대상 아이디", value: profile.userId ?? "-" }]}
      />

      <ErrorDialog
        open={errorDialogMessages != null}
        onClose={() => setErrorDialogMessages(null)}
        title="비밀번호 변경 실패"
        messages={errorDialogMessages ?? []}
      />

      <FormSection title="로그인 비밀번호 변경" className="mb-0">
        <div>
          <FormRow
            label="현재 비밀번호"
            required
            htmlFor="f01-current-pw"
            labelWidth={180}
          >
            <Input
              id="f01-current-pw"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value)
                setPasswordError(null)
              }}
              className="max-w-xs"
            />
          </FormRow>

          <FormRow
            label="신규 비밀번호"
            required
            htmlFor="f01-new-pw"
            labelWidth={180}
          >
            <Input
              id="f01-new-pw"
              type="password"
              autoComplete="new-password"
              maxLength={PASSWORD_MAX}
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value)
                setPasswordError(null)
              }}
              className="max-w-xs"
            />
          </FormRow>

          <FormRow
            label="신규 비밀번호 확인"
            required
            htmlFor="f01-confirm-pw"
            labelWidth={180}
          >
            <Input
              id="f01-confirm-pw"
              type="password"
              autoComplete="new-password"
              maxLength={PASSWORD_MAX}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value)
                setPasswordError(null)
              }}
              className="max-w-xs"
            />
          </FormRow>
        </div>

        <p className="mt-2 text-2xs text-ink-muted">
          ※ 비밀번호는 {PASSWORD_MIN}~{PASSWORD_MAX}자이며
          영문자·숫자·특수문자를 각각 1자 이상 포함해야 합니다. 아이디 포함,
          동일 문자 4자리 연속, 연속 증감 숫자 4자리는 사용할 수 없습니다.
        </p>

        {passwordError && (
          <p role="alert" className="mt-2 text-base font-bold text-danger">
            {passwordError}
          </p>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Button
            variant="secondary"
            size="lg"
            className="min-w-30"
            disabled={changePasswordMutation.isPending}
            onClick={handleReset}
          >
            초기화
          </Button>

          <Button
            variant="primary"
            size="lg"
            className="min-w-30"
            disabled={changePasswordMutation.isPending}
            onClick={handleSubmit}
          >
            {changePasswordMutation.isPending ? "변경 중..." : "변경하기"}
          </Button>
        </div>
      </FormSection>
    </>
  )
}
