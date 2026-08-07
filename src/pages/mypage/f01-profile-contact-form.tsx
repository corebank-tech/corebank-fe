import * as React from "react"
import { Alert } from "@/shared/ui/alert"
import { Button } from "@/shared/ui/button"
import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import { Input } from "@/shared/ui/input"
import { formatPhone } from "@/shared/lib/format"
import { formatClock, useCountdown } from "@/shared/lib/hooks/use-countdown"
import { onlyDigits } from "@/shared/lib/input-filter"
import { cn } from "@/shared/lib/utils"
import { EMAIL_CODE_TTL_SECONDS } from "@/shared/config/policy"
import {
  MOCK_REGISTERED_EMAILS,
  type CustomerProfile,
} from "@/entities/customer"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const generateCode = (): string => {
  return String(Math.floor(100000 + Math.random() * 900000))
}

type Props = {
  profile: CustomerProfile
  onProfileChange: (profile: CustomerProfile) => void
}

export const F01ProfileContactForm = ({ profile, onProfileChange }: Props) => {
  const [phoneDraft, setPhoneDraft] = React.useState(profile.phone)
  const [emailDraft, setEmailDraft] = React.useState(profile.email)
  const [verifiedEmail, setVerifiedEmail] = React.useState<string | null>(
    profile.email,
  )
  const [issuedCode, setIssuedCode] = React.useState<string | null>(null)
  const { remaining: codeRemaining, reset: resetCodeCountdown } = useCountdown(
    EMAIL_CODE_TTL_SECONDS,
    issuedCode != null,
  )
  const [codeInput, setCodeInput] = React.useState("")
  const [codeError, setCodeError] = React.useState<string | null>(null)
  const [infoError, setInfoError] = React.useState<string | null>(null)
  const [infoSuccess, setInfoSuccess] = React.useState<string | null>(null)

  const emailChanged = emailDraft.trim() !== profile.email
  const emailVerifiedForDraft =
    verifiedEmail !== null && verifiedEmail === emailDraft.trim()
  const codeExpired = issuedCode != null && codeRemaining <= 0

  const resetEmailCode = () => {
    setIssuedCode(null)
    resetCodeCountdown()
    setCodeInput("")
    setCodeError(null)
  }

  const handleEmailDraftChange = (email: string) => {
    setEmailDraft(email)
    resetEmailCode()
    if (infoError) setInfoError(null)
  }

  const handleSendCode = () => {
    const trimmedEmail = emailDraft.trim()
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setInfoError("이메일 형식을 확인하세요.")
      return
    }
    if (
      MOCK_REGISTERED_EMAILS.some(
        (registeredEmail) =>
          registeredEmail.toLowerCase() === trimmedEmail.toLowerCase(),
      )
    ) {
      setInfoError("이미 가입된 이메일입니다. 다른 이메일을 입력하세요.")
      return
    }
    setInfoError(null)
    setIssuedCode(generateCode())
    resetCodeCountdown()
    setCodeInput("")
    setCodeError(null)
  }

  const handleVerifyCode = () => {
    if (issuedCode == null) {
      setCodeError("인증번호를 먼저 발송하세요.")
      return
    }
    if (codeExpired) {
      setCodeError("인증번호 유효시간이 지났습니다. 재발송 후 다시 입력하세요.")
      return
    }
    if (codeInput.length !== 6) {
      setCodeError("인증번호 6자리를 모두 입력하세요.")
      return
    }
    if (codeInput !== issuedCode) {
      setCodeError("인증번호가 일치하지 않습니다.")
      return
    }
    setVerifiedEmail(emailDraft.trim())
    setCodeError(null)
  }

  const handleReset = () => {
    setPhoneDraft(profile.phone)
    setEmailDraft(profile.email)
    setVerifiedEmail(profile.email)
    resetEmailCode()
    setInfoError(null)
  }

  const handleSubmit = () => {
    setInfoSuccess(null)
    const trimmedEmail = emailDraft.trim()
    if (phoneDraft.length !== 11) {
      setInfoError("휴대폰번호 11자리를 형식에 맞게 입력하세요.")
      return
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setInfoError("이메일 형식을 확인하세요.")
      return
    }
    if (emailChanged && !emailVerifiedForDraft) {
      setInfoError("이메일 인증번호 확인을 완료해야 저장할 수 있습니다.")
      return
    }
    setInfoError(null)
    onProfileChange({
      ...profile,
      phone: phoneDraft,
      email: trimmedEmail,
    })
    setVerifiedEmail(trimmedEmail)
    resetEmailCode()
    setInfoSuccess("고객정보가 변경되었습니다.")
  }

  return (
    <>
      {infoSuccess && <Alert variant="success">{infoSuccess}</Alert>}

      <FormSection title="고객정보 변경">
        <div>
          <FormRow
            label="휴대폰번호"
            required
            htmlFor="f01-phone"
            labelWidth={180}
          >
            <Input
              id="f01-phone"
              inputMode="numeric"
              maxLength={11}
              value={phoneDraft}
              onChange={(event) => {
                setPhoneDraft(onlyDigits(event.target.value, 11))
                if (infoError) setInfoError(null)
              }}
              className="max-w-[180px] font-tabular"
            />
            {phoneDraft.length === 11 && (
              <span className="font-tabular text-base text-ink-muted">
                {formatPhone(phoneDraft)}
              </span>
            )}
          </FormRow>
          <FormRow label="이메일" required htmlFor="f01-email" labelWidth={180}>
            <div className="flex w-full flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input
                  id="f01-email"
                  type="email"
                  value={emailDraft}
                  onChange={(event) =>
                    handleEmailDraftChange(event.target.value)
                  }
                  className="max-w-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendCode}
                  disabled={!emailChanged}
                >
                  인증번호 발송
                </Button>
              </div>

              {emailChanged && issuedCode != null && (
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "font-tabular text-lg font-bold tracking-15",
                      codeExpired
                        ? "text-ink-faint line-through"
                        : "text-primary",
                    )}
                  >
                    {issuedCode}
                  </span>
                  <span className="font-tabular text-base font-bold text-ink">
                    {formatClock(codeRemaining)}
                  </span>
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="인증번호 6자리"
                    value={codeInput}
                    disabled={codeExpired || emailVerifiedForDraft}
                    onChange={(event) => {
                      setCodeInput(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                      if (codeError) setCodeError(null)
                    }}
                    className="w-32 text-center tracking-3"
                  />
                  {!emailVerifiedForDraft && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleVerifyCode}
                    >
                      인증확인
                    </Button>
                  )}
                  {codeExpired && !emailVerifiedForDraft && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendCode}
                    >
                      재발송
                    </Button>
                  )}
                </div>
              )}

              {emailChanged && emailVerifiedForDraft && (
                <p className="text-xs font-bold text-success">
                  이메일 인증이 완료되었습니다.
                </p>
              )}
              {codeError && (
                <p role="alert" className="text-xs font-bold text-danger">
                  {codeError}
                </p>
              )}
            </div>
          </FormRow>
        </div>
        <p className="mt-2 text-2xs text-ink-muted">
          ※ 이메일을 변경하면 신규 이메일로 인증번호를 재발송해 확인해야 저장할
          수 있습니다. 이미 가입된 이메일로는 변경할 수 없습니다.
        </p>

        {infoError && (
          <p role="alert" className="mt-2 text-base font-bold text-danger">
            {infoError}
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
