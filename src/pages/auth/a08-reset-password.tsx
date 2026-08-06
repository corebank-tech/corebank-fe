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
  isPasswordValid,
  type RuleCheck,
} from "@/entities/auth"
import { MOCK_MEMBERS, type Member } from "@/entities/auth"
import { EMAIL_CODE_TTL_SECONDS as OTP_TTL } from "@/shared/config/policy"
import { formatClock, useCountdown } from "@/shared/lib/hooks/use-countdown"

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

const RuleList = ({ rules }: { rules: RuleCheck[] }) => {
  return (
    <ul className="flex flex-col gap-1">
      {rules.map((r) => (
        <li
          key={r.key}
          className={`flex items-center gap-1.5 text-2xs ${r.passed ? "text-primary" : "text-ink-faint"}`}
        >
          {r.passed ? (
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
          {r.label}
        </li>
      ))}
    </ul>
  )
}

/** A-08 비밀번호 재설정. REQ-AUTH-033·034. */
export const A08ResetPassword = () => {
  const [userId, setUserId] = React.useState("")
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [member, setMember] = React.useState<Member | null>(null)
  const [identityAlert, setIdentityAlert] = React.useState<string | null>(null)

  const [issued, setIssued] = React.useState<string | null>(null)
  const { remaining, reset: resetCountdown } = useCountdown(
    OTP_TTL,
    issued != null,
  )
  const [code, setCode] = React.useState("")
  const [codeError, setCodeError] = React.useState<string | null>(null)
  const [emailVerified, setEmailVerified] = React.useState(false)

  const [newPassword, setNewPassword] = React.useState("")
  const [newPasswordConfirm, setNewPasswordConfirm] = React.useState("")
  const [passwordAlert, setPasswordAlert] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)

  const expired = issued != null && remaining <= 0
  const rules = member
    ? evaluatePasswordRules(newPassword, member.memberId)
    : []

  const verifyIdentity = () => {
    if (
      userId.trim().length === 0 ||
      name.trim().length === 0 ||
      email.trim().length === 0
    ) {
      setIdentityAlert("아이디·성명·가입 이메일을 모두 입력하세요.")
      return
    }
    const found = MOCK_MEMBERS.find(
      (m) =>
        m.memberId === userId.trim() &&
        m.ownerName === name.trim() &&
        m.email === email.trim(),
    )
    if (!found) {
      setIdentityAlert("입력하신 정보와 일치하는 회원을 찾을 수 없습니다.")
      return
    }
    setMember(found)
    setIssued(generateCode())
    resetCountdown()
  }

  const confirmCode = () => {
    if (issued == null) return
    if (expired) {
      setCodeError("입력 시간이 초과되었습니다. 인증번호를 재발송해 주세요.")
      return
    }
    if (code !== issued) {
      setCodeError("인증번호가 올바르지 않습니다. 다시 입력해 주세요.")
      return
    }
    setEmailVerified(true)
    setCodeError(null)
  }

  const resendCode = () => {
    setIssued(generateCode())
    resetCountdown()
    setCode("")
    setCodeError(null)
  }

  const submit = () => {
    if (!member) return
    if (!isPasswordValid(newPassword, member.memberId)) {
      setPasswordAlert("비밀번호 규칙을 확인하세요.")
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setPasswordAlert("새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.")
      return
    }
    if (newPassword === member.loginPassword) {
      setPasswordAlert("직전 비밀번호와 동일한 비밀번호는 사용할 수 없습니다.")
      return
    }
    setDone(true)
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
              disabled={!!member}
              onChange={(e) => setUserId(e.target.value)}
              className="max-w-xs"
            />
          </FormRow>
          <FormRow label="성명" required htmlFor="reset-name">
            <Input
              id="reset-name"
              value={name}
              disabled={!!member}
              onChange={(e) => setName(e.target.value)}
              className="max-w-xs"
            />
          </FormRow>
          <FormRow label="가입 이메일" required htmlFor="reset-email">
            <Input
              id="reset-email"
              type="email"
              value={email}
              disabled={!!member}
              onChange={(e) => setEmail(e.target.value)}
              className="max-w-xs"
            />
          </FormRow>
        </div>
        {!member && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="primary"
              size="lg"
              className="min-w-40"
              onClick={verifyIdentity}
            >
              본인확인
            </Button>
          </div>
        )}
      </FormSection>

      {member && !emailVerified && (
        <FormSection title="이메일 인증">
          <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
            <span
              className={`text-lg font-bold tracking-2 tabular-nums ${expired ? "text-ink-faint line-through" : "text-primary"}`}
              aria-label="발송된 이메일 인증번호"
            >
              {issued}
            </span>
            <span
              className={`text-base font-bold tabular-nums ${expired ? "text-ink-faint" : "text-ink"}`}
            >
              {formatClock(remaining)}
            </span>
            <Input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                if (codeError) setCodeError(null)
              }}
              placeholder="인증번호 6자리"
              className="w-32 text-center tracking-3"
            />
            <Button variant="secondary" size="sm" onClick={confirmCode}>
              확인
            </Button>
            {expired && (
              <Button variant="outline" size="sm" onClick={resendCode}>
                재발송
              </Button>
            )}
          </div>
          {codeError && (
            <p className="mt-2 text-2xs font-bold text-danger">{codeError}</p>
          )}
          <p className="mt-2 text-2xs text-ink-muted">
            ※ 이메일로 발송된 인증번호는 180초간 유효합니다(Mock 표시형).
          </p>
        </FormSection>
      )}

      {member && emailVerified && !done && (
        <FormSection title="새 비밀번호 설정">
          <div>
            <FormRow label="새 비밀번호" required htmlFor="reset-new-pw">
              <div className="flex w-full flex-col gap-1.5">
                <Input
                  id="reset-new-pw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value.slice(0, 15))}
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
                onChange={(e) =>
                  setNewPasswordConfirm(e.target.value.slice(0, 15))
                }
                className="max-w-xs"
              />
            </FormRow>
          </div>
          <p className="mt-2 text-2xs text-ink-muted">
            ※ 직전 비밀번호와 동일한 비밀번호로는 재설정할 수 없습니다.
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              variant="primary"
              size="lg"
              className="min-w-40"
              onClick={submit}
            >
              비밀번호 재설정
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
          "비밀번호 재설정은 아이디·성명·가입 이메일 일치 확인 후 이메일 인증을 거쳐 진행됩니다.",
          "신규 비밀번호는 회원가입과 동일한 규칙(8~15자, 3종 이상 조합, 금칙 규칙)이 적용됩니다.",
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
