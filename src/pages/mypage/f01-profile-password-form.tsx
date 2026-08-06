import * as React from "react"
import { Alert } from "@/shared/ui/alert"
import { Button } from "@/shared/ui/button"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { ErrorDialog } from "@/shared/ui/error-dialog"
import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import { Input } from "@/shared/ui/input"
import type { CustomerProfile } from "@/entities/customer"

const PASSWORD_MIN = 8
const PASSWORD_MAX = 15

/** POL-010·011: 8~15자 / 4종 중 3종 이상, 아이디 포함 금지, 동일문자·연속증감 4자리 금지. */
const validateLoginPassword = (
  password: string,
  userId: string,
): string | null => {
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return `비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자로 입력하세요.`
  }
  let characterClassCount = 0
  if (/[A-Z]/.test(password)) characterClassCount++
  if (/[a-z]/.test(password)) characterClassCount++
  if (/[0-9]/.test(password)) characterClassCount++
  if (/[^A-Za-z0-9]/.test(password)) characterClassCount++
  if (characterClassCount < 3) {
    return "영문 대문자·소문자·숫자·특수문자 중 3종 이상을 조합하세요."
  }
  if (userId && password.toLowerCase().includes(userId.toLowerCase())) {
    return "비밀번호에 아이디를 포함할 수 없습니다."
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
  profile: CustomerProfile
  onProfileChange: (profile: CustomerProfile) => void
}

export const F01ProfilePasswordForm = ({ profile, onProfileChange }: Props) => {
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [passwordError, setPasswordError] = React.useState<string | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false)
  const [errorDialogMessages, setErrorDialogMessages] = React.useState<
    string[] | null
  >(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  )

  const handleReset = () => {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setPasswordError(null)
  }

  const handleSubmit = () => {
    setSuccessMessage(null)
    if (currentPassword.length === 0) {
      setPasswordError("현재 비밀번호를 입력하세요.")
      return
    }
    const ruleError = validateLoginPassword(newPassword, profile.userId)
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
    if (newPassword === currentPassword) {
      setPasswordError("현재 비밀번호와 동일한 값으로 변경할 수 없습니다.")
      return
    }
    setPasswordError(null)
    setIsConfirmOpen(true)
  }

  const handleConfirm = () => {
    setIsConfirmOpen(false)
    if (currentPassword !== profile.currentPassword) {
      setErrorDialogMessages(["현재 비밀번호가 일치하지 않습니다."])
      setCurrentPassword("")
      return
    }
    onProfileChange({ ...profile, currentPassword: newPassword })
    handleReset()
    setSuccessMessage(
      "로그인 비밀번호가 변경되었습니다. 다음 로그인부터 신규 비밀번호가 적용됩니다.",
    )
  }

  return (
    <>
      <ConfirmDialog
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="로그인 비밀번호 변경"
        messages={[
          "현재 비밀번호를 확인한 뒤 신규 비밀번호로 변경합니다.",
          "확인을 누르면 즉시 적용됩니다.",
        ]}
        confirmLabel="변경하기"
        items={[{ label: "대상 아이디", value: profile.userId }]}
      />

      <ErrorDialog
        open={errorDialogMessages != null}
        onClose={() => setErrorDialogMessages(null)}
        title="비밀번호 변경 실패"
        messages={errorDialogMessages ?? []}
      />

      {successMessage && <Alert variant="success">{successMessage}</Alert>}

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
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
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
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
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
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="max-w-xs"
            />
          </FormRow>
        </div>
        <p className="mt-2 text-2xs text-ink-muted">
          ※ 비밀번호는 {PASSWORD_MIN}~{PASSWORD_MAX}자, 영문
          대문자·소문자·숫자·특수문자 중 3종 이상 조합이며 아이디 포함, 동일문자
          4자리 연속, 연속 증감 숫자 4자리는 사용할 수 없습니다.
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
            onClick={handleReset}
          >
            초기화
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="min-w-30"
            onClick={handleSubmit}
          >
            변경하기
          </Button>
        </div>
      </FormSection>
    </>
  )
}
