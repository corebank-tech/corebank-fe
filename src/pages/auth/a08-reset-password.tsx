import * as React from "react"
import { Link } from "react-router"
import { Check, X } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Alert } from "@/shared/ui/alert"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { AlertDialog } from "@/shared/ui/alert-dialog"
import {
  evaluatePasswordRules,
  useIssuePasswordResetMutation,
  useResetPasswordMutation,
  type RuleCheck,
} from "@/entities/auth"
import { isApiError, toErrorMessage } from "@/shared/api/api-error"
import { EMAIL_CODE_TTL_SECONDS as OTP_TTL } from "@/shared/config/policy"
import { formatClock, useCountdown } from "@/shared/lib/hooks/use-countdown"

const RuleList = ({ rules }: { rules: RuleCheck[] }) => {
  return (
    <ul className="flex flex-col gap-1">
      {rules.map((rule) => (
        <li
          key={rule.key}
          className={`flex items-center gap-1.5 text-2xs ${
            rule.passed ? "text-primary" : "text-ink-faint"
          }`}
        >
          {rule.passed ? (
            <Check
              className="h-3 w-3 shrink-0"
              strokeWidth={3}
              aria-hidden="true"
            />
          ) : (
            <X
              className="h-3 w-3 shrink-0"
              strokeWidth={3}
              aria-hidden="true"
            />
          )}
          {rule.label}
        </li>
      ))}
    </ul>
  )
}

/** A-08 비밀번호 재설정. REQ-AUTH-033·034. */
export const A08ResetPassword = () => {
  const issueMutation = useIssuePasswordResetMutation()
  const resetMutation = useResetPasswordMutation()

  const [userId, setUserId] = React.useState("")
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [identityAlert, setIdentityAlert] = React.useState<string | null>(null)

  const [resetRequestId, setResetRequestId] = React.useState<string | null>(
    null,
  )
  const [issuedCode, setIssuedCode] = React.useState<string | null>(null)
  const [code, setCode] = React.useState("")
  const [codeError, setCodeError] = React.useState<string | null>(null)

  // 서버에서 별도 인증번호 확인 API를 제공하지 않는다.
  // 이 값은 입력 형식 확인 후 다음 단계로 이동했는지만 의미한다.
  const [codeEntered, setCodeEntered] = React.useState(false)
  const [reissueRequired, setReissueRequired] = React.useState(false)

  const [newPassword, setNewPassword] = React.useState("")
  const [newPasswordConfirm, setNewPasswordConfirm] = React.useState("")
  const [passwordAlert, setPasswordAlert] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)

  // 동일 요청 재시도에는 같은 키를 사용한다.
  // 요청 본문이 변경되거나 인증번호를 재발급하면 새 키를 만든다.
  const resetKeyRef = React.useRef(crypto.randomUUID())

  const { remaining, reset: resetCountdown } = useCountdown(
    OTP_TTL,
    resetRequestId !== null && !done,
  )

  const expired = resetRequestId !== null && remaining <= 0
  const rules = evaluatePasswordRules(newPassword, userId.trim())

  const requestCode = async (resend: boolean) => {
    if (issueMutation.isPending) return

    if (!userId.trim() || !name.trim() || !email.trim()) {
      setIdentityAlert("아이디·성명·가입 이메일을 모두 입력하세요.")
      return
    }

    try {
      const result = await issueMutation.mutateAsync({
        userId: userId.trim(),
        customerName: name.trim(),
        email: email.trim(),
      })

      if (!result.passwordResetRequestId || !result.verificationCode) {
        setResetRequestId(null)
        setIssuedCode(null)
        setIdentityAlert("인증번호 발급 결과를 확인할 수 없습니다.")
        return
      }

      setResetRequestId(result.passwordResetRequestId)
      setIssuedCode(result.verificationCode)
      setCode("")
      setCodeError(null)
      setCodeEntered(false)
      setReissueRequired(false)

      setNewPassword("")
      setNewPasswordConfirm("")
      setPasswordAlert(null)

      resetKeyRef.current = crypto.randomUUID()
      resetCountdown(result.expiresIn ?? OTP_TTL)
    } catch (error) {
      if (resend) {
        setCodeError(toErrorMessage(error))
      } else {
        setIdentityAlert(toErrorMessage(error))
      }
    }
  }

  const verifyIdentity = async () => {
    await requestCode(false)
  }

  const resendCode = async () => {
    await requestCode(true)
  }

  const confirmCode = () => {
    if (!resetRequestId) return

    if (expired || reissueRequired) {
      setCodeError("인증번호를 다시 발급받아 주세요.")
      return
    }

    if (!/^\d{6}$/.test(code)) {
      setCodeError("인증번호 6자리를 입력하세요.")
      return
    }

    // 실제 일치 여부는 최종 PUT 요청에서 서버가 검증한다.
    setCodeEntered(true)
    setCodeError(null)
  }

  const submit = async () => {
    if (!resetRequestId || resetMutation.isPending) return

    if (expired || reissueRequired) {
      setCodeEntered(false)
      setCodeError("인증번호가 만료되었거나 무효화되었습니다. 재발급해 주세요.")
      return
    }

    if (!rules.every((rule) => rule.passed)) {
      setPasswordAlert("비밀번호 규칙을 확인하세요.")
      return
    }

    if (newPassword !== newPasswordConfirm) {
      setPasswordAlert("새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.")
      return
    }

    try {
      await resetMutation.mutateAsync({
        passwordResetRequestId: resetRequestId,
        request: {
          verificationCode: code,
          newPassword,
          newPasswordConfirm,
        },
        idempotencyKey: resetKeyRef.current,
      })

      setCode("")
      setIssuedCode(null)
      setNewPassword("")
      setNewPasswordConfirm("")
      setDone(true)
    } catch (error) {
      if (isApiError(error)) {
        if (error.code === "ATH0007") {
          // 인증번호 불일치: 입력 단계로 돌아간다.
          setCodeEntered(false)
          setCodeError(error.message)
          return
        }

        if (error.code === "ATH0008" || error.code === "ATH0202") {
          // 만료 또는 무효화된 요청: 재발급이 필요하다.
          setCodeEntered(false)
          setReissueRequired(true)
          setCodeError(error.message)
          return
        }
      }

      // 비밀번호 정책 위반 등은 서버 오류 메시지를 표시한다.
      setPasswordAlert(toErrorMessage(error))
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {done && (
        <Alert variant="success" title="재설정 완료">
          비밀번호가 재설정되었습니다. 새 비밀번호로 로그인하세요.
        </Alert>
      )}

      <FormSection title="본인확인">
        <div>
          <FormRow label="아이디" required htmlFor="reset-id">
            <Input
              id="reset-id"
              value={userId}
              disabled={resetRequestId !== null || issueMutation.isPending}
              onChange={(e) => setUserId(e.target.value)}
              className="max-w-xs"
            />
          </FormRow>
          <FormRow label="성명" required htmlFor="reset-name">
            <Input
              id="reset-name"
              value={name}
              disabled={resetRequestId !== null || issueMutation.isPending}
              onChange={(e) => setName(e.target.value)}
              className="max-w-xs"
            />
          </FormRow>
          <FormRow label="가입 이메일" required htmlFor="reset-email">
            <Input
              id="reset-email"
              type="email"
              value={email}
              disabled={resetRequestId !== null || issueMutation.isPending}
              onChange={(e) => setEmail(e.target.value)}
              className="max-w-xs"
            />
          </FormRow>
        </div>

        {resetRequestId === null && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="primary"
              size="lg"
              className="min-w-40"
              disabled={issueMutation.isPending}
              onClick={verifyIdentity}
            >
              {issueMutation.isPending ? "확인 중..." : "본인확인"}
            </Button>
          </div>
        )}
      </FormSection>

      {resetRequestId !== null && !codeEntered && !done && (
        <FormSection title="인증번호 입력">
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
            {issuedCode !== null && (
              <span
                className={`text-lg font-bold tracking-2 ${
                  expired ? "text-ink-faint line-through" : "text-primary"
                }`}
                aria-label="서버에서 발급된 인증번호"
              >
                {issuedCode}
              </span>
            )}

            <span
              className={`text-base font-bold ${
                expired ? "text-ink-faint" : "text-ink"
              }`}
            >
              {formatClock(remaining)}
            </span>

            <Input
              inputMode="numeric"
              maxLength={6}
              value={code}
              aria-label="인증번호 6자리"
              disabled={expired || reissueRequired || issueMutation.isPending}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                setCodeError(null)
                resetKeyRef.current = crypto.randomUUID()
              }}
              placeholder="인증번호 6자리"
              className="w-40 text-center tracking-3"
            />

            <Button
              variant="secondary"
              size="sm"
              onClick={confirmCode}
              disabled={expired || reissueRequired}
            >
              다음
            </Button>

            {(expired || reissueRequired) && (
              <Button
                variant="outline"
                size="sm"
                disabled={issueMutation.isPending}
                onClick={resendCode}
              >
                {issueMutation.isPending ? "발급 중..." : "재발급"}
              </Button>
            )}
          </div>

          {codeError && (
            <p className="mt-2 text-2xs font-bold text-danger">{codeError}</p>
          )}

          <p className="mt-2 text-2xs text-ink-muted">
            ※ 인증번호 유효시간은 180초입니다.
          </p>
        </FormSection>
      )}

      {resetRequestId !== null && codeEntered && !done && (
        <FormSection title="새 비밀번호 설정">
          <div>
            <FormRow label="새 비밀번호" required htmlFor="reset-new-pw">
              <div className="flex w-full flex-col gap-1.5">
                <Input
                  id="reset-new-pw"
                  type="password"
                  value={newPassword}
                  maxLength={15}
                  disabled={resetMutation.isPending}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    resetKeyRef.current = crypto.randomUUID()
                    setPasswordAlert(null)
                  }}
                  className="max-w-xs"
                />
                <RuleList rules={rules} />
              </div>
            </FormRow>

            <FormRow
              label="새 비밀번호 확인"
              required
              htmlFor="reset-new-pw-confirm"
            >
              <Input
                id="reset-new-pw-confirm"
                type="password"
                value={newPasswordConfirm}
                maxLength={15}
                disabled={resetMutation.isPending}
                onChange={(e) => {
                  setNewPasswordConfirm(e.target.value)
                  resetKeyRef.current = crypto.randomUUID()
                  setPasswordAlert(null)
                }}
                className="max-w-xs"
              />
            </FormRow>
          </div>

          <p className="mt-2 text-2xs text-ink-muted">
            ※ 직전 비밀번호는 재사용할 수 없습니다.
          </p>
          <p className="mt-1 text-2xs text-ink-muted">
            ※ 인증번호 남은 유효시간: {formatClock(remaining)}
          </p>

          <div className="mt-6 flex justify-center">
            <Button
              variant="primary"
              size="lg"
              className="min-w-40"
              disabled={resetMutation.isPending}
              onClick={submit}
            >
              {resetMutation.isPending ? "재설정 중..." : "비밀번호 재설정"}
            </Button>
          </div>
        </FormSection>
      )}

      <div className="flex items-center justify-center gap-3 text-base text-ink-muted">
        <Link to="/find-id" className="hover:text-primary hover:underline">
          아이디 찾기
        </Link>
        <span className="text-border-strong" aria-hidden="true">
          |
        </span>
        <Link to="/" className="hover:text-primary hover:underline">
          로그인
        </Link>
      </div>

      <NoticeBoxFooter
        items={[
          "비밀번호 재설정은 아이디·성명·가입 이메일 확인 후 인증번호를 발급받아 진행합니다.",
          "신규 비밀번호는 8~15자이며 영문자·숫자·특수문자를 모두 포함해야 합니다.",
        ]}
      />

      <AlertDialog
        open={identityAlert !== null}
        onClose={() => setIdentityAlert(null)}
        title="본인확인"
        messages={identityAlert ? [identityAlert] : []}
      />
      <AlertDialog
        open={passwordAlert !== null}
        onClose={() => setPasswordAlert(null)}
        title="비밀번호 재설정"
        messages={passwordAlert ? [passwordAlert] : []}
      />
    </div>
  )
}
