import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  CUSTOMER_EMAIL_CHANGE_PURPOSE,
  getCustomerProfileQueryKey,
  useCustomerEmailVerificationIssueMutation,
  useCustomerEmailVerificationMutation,
  useCustomerProfileUpdateMutation,
  type CustomerInfo,
} from "@/entities/customer"
import { isApiError } from "@/shared/api/api-error"
import { EMAIL_CODE_TTL_SECONDS } from "@/shared/config/policy"
import { formatPhone } from "@/shared/lib/format"
import { formatClock, useCountdown } from "@/shared/lib/hooks/use-countdown"
import { onlyDigits } from "@/shared/lib/input-filter"
import { cn } from "@/shared/lib/utils"
import { Alert } from "@/shared/ui/alert"
import { Button } from "@/shared/ui/button"
import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import { Input } from "@/shared/ui/input"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Props = {
  profile: CustomerInfo
}

const getErrorMessage = (error: unknown): string => {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return "요청 처리 중 오류가 발생했습니다."
}

export const F01ProfileContactForm = ({ profile }: Props) => {
  const queryClient = useQueryClient()

  const updateMutation = useCustomerProfileUpdateMutation()
  const issueEmailMutation = useCustomerEmailVerificationIssueMutation()
  const verifyEmailMutation = useCustomerEmailVerificationMutation()

  const [phoneDraft, setPhoneDraft] = React.useState("")
  const [emailDraft, setEmailDraft] = React.useState("")

  const [emailVerificationId, setEmailVerificationId] = React.useState<
    string | null
  >(null)
  const [emailVerificationToken, setEmailVerificationToken] = React.useState<
    string | null
  >(null)
  const [issuedCode, setIssuedCode] = React.useState<string | null>(null)

  const { remaining: codeRemaining, reset: resetCodeCountdown } = useCountdown(
    EMAIL_CODE_TTL_SECONDS,
    emailVerificationId !== null && emailVerificationToken === null,
  )

  const [codeInput, setCodeInput] = React.useState("")
  const [codeError, setCodeError] = React.useState<string | null>(null)
  const [infoError, setInfoError] = React.useState<string | null>(null)
  const [infoSuccess, setInfoSuccess] = React.useState<string | null>(null)

  const trimmedEmail = emailDraft.trim()
  const phoneChanged = phoneDraft.length > 0
  const emailChanged = trimmedEmail.length > 0

  const emailVerified = emailVerificationToken !== null
  const codeExpired = emailVerificationId !== null && codeRemaining <= 0

  const resetEmailVerification = () => {
    setEmailVerificationId(null)
    setEmailVerificationToken(null)
    setIssuedCode(null)
    setCodeInput("")
    setCodeError(null)
    resetCodeCountdown()
  }

  const handleEmailDraftChange = (email: string) => {
    setEmailDraft(email)
    resetEmailVerification()
    setInfoError(null)
    setInfoSuccess(null)
  }

  const handleSendCode = async () => {
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setInfoError("이메일 형식을 확인하세요.")
      return
    }

    setInfoError(null)
    setInfoSuccess(null)
    setCodeError(null)

    try {
      const response = await issueEmailMutation.mutateAsync({
        data: {
          email: trimmedEmail,
          purpose: CUSTOMER_EMAIL_CHANGE_PURPOSE,
        },
      })

      const { emailVerificationId, verificationCode } = response

      if (!emailVerificationId || !verificationCode) {
        setInfoError("이메일 인증 응답을 확인할 수 없습니다.")
        return
      }

      setEmailVerificationId(emailVerificationId)
      setEmailVerificationToken(null)
      setIssuedCode(verificationCode)
      setCodeInput("")
      resetCodeCountdown(response.expiresIn)
    } catch (error) {
      setInfoError(getErrorMessage(error))
    }
  }

  const handleVerifyCode = async () => {
    if (emailVerificationId === null) {
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

    setCodeError(null)

    try {
      const response = await verifyEmailMutation.mutateAsync({
        emailVerificationId,
        data: {
          verificationCode: codeInput,
        },
      })

      const { emailVerificationToken } = response

      if (!emailVerificationToken) {
        setCodeError("이메일 인증 결과를 확인할 수 없습니다.")
        return
      }

      setEmailVerificationToken(emailVerificationToken)
    } catch (error) {
      setCodeError(getErrorMessage(error))
    }
  }

  const handleReset = () => {
    setPhoneDraft("")
    setEmailDraft("")
    resetEmailVerification()
    setInfoError(null)
    setInfoSuccess(null)
  }

  const handleSubmit = async () => {
    setInfoError(null)
    setInfoSuccess(null)

    if (!phoneChanged && !emailChanged) {
      setInfoError("변경할 휴대폰번호 또는 이메일을 입력하세요.")
      return
    }

    if (phoneChanged && phoneDraft.length !== 11) {
      setInfoError("휴대폰번호 11자리를 형식에 맞게 입력하세요.")
      return
    }

    if (emailChanged && !EMAIL_PATTERN.test(trimmedEmail)) {
      setInfoError("이메일 형식을 확인하세요.")
      return
    }

    if (emailChanged && emailVerificationToken === null) {
      setInfoError("이메일 인증번호 확인을 완료해야 저장할 수 있습니다.")
      return
    }

    try {
      await updateMutation.mutateAsync({
        data: {
          phoneNumber: phoneChanged ? phoneDraft : null,
          email: emailChanged ? trimmedEmail : null,
          emailVerificationToken: emailChanged ? emailVerificationToken : null,
        },
      })

      await queryClient.invalidateQueries({
        queryKey: getCustomerProfileQueryKey(),
      })

      setPhoneDraft("")
      setEmailDraft("")
      resetEmailVerification()

      setInfoSuccess("고객정보가 변경되었습니다.")
    } catch (error) {
      setInfoError(getErrorMessage(error))
    }
  }

  const isSubmitting =
    updateMutation.isPending ||
    issueEmailMutation.isPending ||
    verifyEmailMutation.isPending

  return (
    <>
      {infoSuccess && <Alert variant="success">{infoSuccess}</Alert>}

      <FormSection title="고객정보 변경">
        <div>
          <FormRow label="현재 휴대폰번호" labelWidth={180}>
            <span className="text-ink">{profile.phoneNumber}</span>
          </FormRow>

          <FormRow label="새 휴대폰번호" htmlFor="f01-phone" labelWidth={180}>
            <Input
              id="f01-phone"
              inputMode="numeric"
              maxLength={11}
              placeholder="숫자 11자리"
              value={phoneDraft}
              onChange={(event) => {
                setPhoneDraft(onlyDigits(event.target.value, 11))
                setInfoError(null)
                setInfoSuccess(null)
              }}
              className="max-w-[180px]"
            />

            {phoneDraft.length === 11 && (
              <span className="text-base text-ink-muted">
                {formatPhone(phoneDraft)}
              </span>
            )}
          </FormRow>

          <FormRow label="현재 이메일" labelWidth={180}>
            <span className="text-ink">{profile.email}</span>
          </FormRow>

          <FormRow label="새 이메일" htmlFor="f01-email" labelWidth={180}>
            <div className="flex w-full flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input
                  id="f01-email"
                  type="email"
                  placeholder="새 이메일 주소"
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
                  disabled={!emailChanged || issueEmailMutation.isPending}
                >
                  인증번호 발송
                </Button>
              </div>

              {emailChanged && issuedCode !== null && (
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-lg font-bold tracking-15",
                      codeExpired
                        ? "text-ink-faint line-through"
                        : "text-primary",
                    )}
                  >
                    {issuedCode}
                  </span>

                  <span className="text-base font-bold text-ink">
                    {formatClock(codeRemaining)}
                  </span>

                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="인증번호 6자리"
                    value={codeInput}
                    disabled={codeExpired || emailVerified}
                    onChange={(event) => {
                      setCodeInput(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                      setCodeError(null)
                    }}
                    className="w-32 text-center tracking-3"
                  />

                  {!emailVerified && !codeExpired && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleVerifyCode}
                      disabled={verifyEmailMutation.isPending}
                    >
                      인증확인
                    </Button>
                  )}

                  {codeExpired && !emailVerified && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendCode}
                      disabled={issueEmailMutation.isPending}
                    >
                      재발송
                    </Button>
                  )}
                </div>
              )}

              {emailChanged && emailVerified && (
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
          ※ 휴대폰번호와 이메일 중 변경할 항목만 입력하세요. 이메일을 변경하는
          경우 신규 이메일 인증을 완료해야 저장할 수 있습니다.
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
            disabled={isSubmitting}
          >
            초기화
          </Button>

          <Button
            variant="primary"
            size="lg"
            className="min-w-30"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            변경하기
          </Button>
        </div>
      </FormSection>
    </>
  )
}
