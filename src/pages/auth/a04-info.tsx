import * as React from "react"
import { Check, X } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { StepLayout } from "@/shared/ui/step-layout"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { AlertDialog } from "@/shared/ui/alert-dialog"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import {
  evaluateIdRules,
  evaluatePasswordRules,
  isIdValid,
  isPasswordValid,
  useCheckSignupUserIdMutation,
  useIssueSignupEmailVerificationMutation,
  useValidateSignupMutation,
  useVerifySignupEmailMutation,
  type RuleCheck,
} from "@/entities/auth"
import { isApiError } from "@/shared/api/api-error"
import { formatPhone } from "@/shared/lib/format"
import { onlyDigits } from "@/shared/lib/input-filter"
import { EMAIL_CODE_TTL_SECONDS as EMAIL_OTP_TTL } from "@/shared/config/policy"
import { formatClock, useCountdown } from "@/shared/lib/hooks/use-countdown"
import {
  SIGNUP_STEPS,
  type SignupAuthState,
  type SignupData,
} from "@/pages/auth/signup-shared"

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

const getErrorMessage = (error: unknown): string => {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return "요청 처리 중 오류가 발생했습니다."
}

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

type PendingIdCheck = {
  userId: string
  token: string
}

type A04InfoProps = {
  data: SignupData
  auth: SignupAuthState
  onChange: (partial: Partial<SignupData>) => void
  onAuthChange: (partial: Partial<SignupAuthState>) => void
  onNext: (tempSignupToken: string) => void
}

/** A-04 회원가입 3단계 · 정보입력. REQ-AUTH-008~017. */
export const A04Info = ({
  data,
  auth,
  onChange,
  onAuthChange,
  onNext,
}: A04InfoProps) => {
  const checkUserIdMutation = useCheckSignupUserIdMutation()
  const issueEmailMutation = useIssueSignupEmailVerificationMutation()
  const verifyEmailMutation = useVerifySignupEmailMutation()
  const validateSignupMutation = useValidateSignupMutation()

  const [dupAlert, setDupAlert] = React.useState<string | null>(null)
  const [dupConfirmOpen, setDupConfirmOpen] = React.useState(false)
  const [pendingIdCheck, setPendingIdCheck] =
    React.useState<PendingIdCheck | null>(null)

  const [emailIssuedCode, setEmailIssuedCode] = React.useState<string | null>(
    null,
  )
  const [emailCode, setEmailCode] = React.useState("")
  const [emailError, setEmailError] = React.useState<string | null>(null)

  const emailIssued = auth.emailVerificationId != null
  const emailVerified =
    auth.verifiedEmail != null && auth.verifiedEmail === data.email
  const idConfirmed =
    auth.checkedUserId != null && auth.checkedUserId === data.userId

  const { remaining: emailRemaining, reset: resetEmailCountdown } =
    useCountdown(EMAIL_OTP_TTL, emailIssued && !emailVerified)

  const emailExpired = emailIssued && emailRemaining <= 0

  const [alert, setAlert] = React.useState<string | null>(null)

  const idRef = React.useRef<HTMLInputElement>(null)
  const passwordRef = React.useRef<HTMLInputElement>(null)
  const passwordConfirmRef = React.useRef<HTMLInputElement>(null)
  const emailRef = React.useRef<HTMLInputElement>(null)
  const phoneRef = React.useRef<HTMLInputElement>(null)

  const idRules = evaluateIdRules(data.userId)
  const passwordRules = evaluatePasswordRules(data.password, data.userId)

  const passwordMismatch =
    data.passwordConfirm.length > 0 && data.passwordConfirm !== data.password

  const handleUserIdChange = (value: string) => {
    const nextUserId = value.replace(/[^a-z0-9]/g, "").slice(0, 16)

    onChange({ userId: nextUserId })

    if (nextUserId !== auth.checkedUserId) {
      onAuthChange({
        userIdCheckToken: undefined,
        checkedUserId: undefined,
      })
    }
  }
  const handleDupCheck = async () => {
    if (!isIdValid(data.userId)) {
      setDupAlert("아이디 규칙을 먼저 확인하세요.")
      return
    }
    try {
      const result = await checkUserIdMutation.mutateAsync({
        userId: data.userId,
      })

      if (!result.isAvailable || !result.userIdCheckToken) {
        setDupAlert("이미 사용 중인 아이디입니다. 다른 아이디를 입력해 주세요.")
        return
      }

      setPendingIdCheck({
        userId: data.userId,
        token: result.userIdCheckToken,
      })
      setDupConfirmOpen(true)
    } catch (error) {
      setDupAlert(getErrorMessage(error))
    }
  }

  const confirmId = () => {
    if (!pendingIdCheck) return

    onAuthChange({
      userIdCheckToken: pendingIdCheck.token,
      checkedUserId: pendingIdCheck.userId,
    })

    setPendingIdCheck(null)
    setDupConfirmOpen(false)
  }

  const handleEmailChange = (value: string) => {
    const nextEmail = value.replace(/\s/g, "")

    onChange({ email: nextEmail })

    if (nextEmail !== auth.verifiedEmail) {
      onAuthChange({
        emailVerificationId: undefined,
        emailVerificationToken: undefined,
        verifiedEmail: undefined,
      })

      setEmailIssuedCode(null)
      setEmailCode("")
      setEmailError(null)
    }
  }

  const sendEmailCode = async () => {
    if (!isValidEmail(data.email)) {
      setAlert("이메일 주소를 정확히 입력하세요.")
      emailRef.current?.focus()
      return
    }

    try {
      const result = await issueEmailMutation.mutateAsync({
        email: data.email,
        purpose: "SIGN_UP",
      })

      if (!result.emailVerificationId) {
        setAlert("이메일 인증 요청을 생성하지 못했습니다.")
        return
      }

      onAuthChange({
        emailVerificationId: result.emailVerificationId,
        emailVerificationToken: undefined,
        verifiedEmail: undefined,
      })

      setEmailIssuedCode(result.verificationCode ?? null)
      setEmailCode("")
      setEmailError(null)
      resetEmailCountdown()
    } catch (error) {
      setAlert(getErrorMessage(error))
    }
  }

  const confirmEmailCode = async () => {
    const emailVerificationId = auth.emailVerificationId

    if (!emailVerificationId) {
      setEmailError("먼저 인증번호를 발송해 주세요.")
      return
    }

    if (emailExpired) {
      setEmailError("입력 시간이 초과되었습니다. 인증번호를 재발송해 주세요.")
      return
    }

    if (emailCode.length !== 6) {
      setEmailError("인증번호 6자리를 입력하세요.")
      return
    }

    try {
      const result = await verifyEmailMutation.mutateAsync({
        emailVerificationId,
        request: {
          verificationCode: emailCode,
        },
      })

      if (!result.emailVerificationToken) {
        setEmailError("이메일 인증 토큰을 발급받지 못했습니다.")
        return
      }
      onAuthChange({
        emailVerificationToken: result.emailVerificationToken,
        verifiedEmail: data.email,
      })

      setEmailError(null)
    } catch (error) {
      setEmailError(getErrorMessage(error))
    }
  }

  const handleNext = async () => {
    if (!isIdValid(data.userId)) {
      setAlert("아이디 규칙을 확인하세요.")
      idRef.current?.focus()
      return
    }
    if (!idConfirmed) {
      setAlert("아이디 중복여부를 확인해주세요.")
      return
    }
    if (!isPasswordValid(data.password, data.userId)) {
      setAlert("비밀번호 규칙을 확인하세요.")
      passwordRef.current?.focus()
      return
    }
    if (data.password !== data.passwordConfirm) {
      setAlert("비밀번호와 비밀번호 확인이 일치하지 않습니다.")
      passwordConfirmRef.current?.focus()
      return
    }
    if (!emailVerified) {
      setAlert("이메일 인증을 완료하세요.")
      return
    }
    if (data.phone.length !== 11) {
      setAlert("휴대폰번호를 정확히 입력하세요.")
      phoneRef.current?.focus()
      return
    }
    try {
      const result = await validateSignupMutation.mutateAsync({
        termsAuthToken: auth.termsAuthToken,
        accountAuthToken: auth.accountAuthToken,
        userIdCheckToken: auth.userIdCheckToken,
        emailVerificationToken: auth.emailVerificationToken,
        tempSignupToken: auth.tempSignupToken,

        userId: data.userId,
        userPassword: data.password,
        userPasswordConfirm: data.passwordConfirm,
        email: data.email,
        phoneNumber: data.phone,
      })

      if (!result.tempSignupToken) {
        setAlert("회원가입 임시 토큰을 발급받지 못했습니다.")
        return
      }

      onNext(result.tempSignupToken)
    } catch (error) {
      setAlert(getErrorMessage(error))
    }
  }

  return (
    <>
      <StepLayout
        steps={SIGNUP_STEPS}
        currentStep={3}
        title="회원가입"
        footer={
          <Button
            variant="primary"
            size="lg"
            className="min-w-40"
            disabled={validateSignupMutation.isPending}
            onClick={handleNext}
          >
            {validateSignupMutation.isPending ? "확인 중..." : "다음"}
          </Button>
        }
      >
        <FormSection title="계정정보">
          <div>
            <FormRow label="아이디" required htmlFor="signup-id">
              <div className="flex w-full flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Input
                    id="signup-id"
                    ref={idRef}
                    value={data.userId}
                    onChange={(e) => handleUserIdChange(e.target.value)}
                    placeholder="영문 소문자로 시작, 영문/숫자 6~16자"
                    className="max-w-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={checkUserIdMutation.isPending}
                    onClick={handleDupCheck}
                  >
                    {checkUserIdMutation.isPending ? "확인 중" : "중복확인"}
                  </Button>
                  {idConfirmed && (
                    <span className="text-xs font-bold whitespace-nowrap text-primary">
                      확인 완료
                    </span>
                  )}
                </div>
                <RuleList rules={idRules} />
              </div>
            </FormRow>
            <FormRow label="비밀번호" required htmlFor="signup-pw">
              <div className="flex w-full flex-col gap-1.5">
                <Input
                  id="signup-pw"
                  ref={passwordRef}
                  type="password"
                  value={data.password}
                  onChange={(e) =>
                    onChange({ password: e.target.value.slice(0, 15) })
                  }
                  placeholder="8~15자, 영문 대/소문자·숫자·특수문자 중 3종 이상"
                  className="max-w-xs"
                />
                <RuleList rules={passwordRules} />
              </div>
            </FormRow>
            <FormRow label="비밀번호 확인" required htmlFor="signup-pw-confirm">
              <div className="flex w-full flex-col gap-1">
                <Input
                  id="signup-pw-confirm"
                  ref={passwordConfirmRef}
                  type="password"
                  value={data.passwordConfirm}
                  onChange={(e) =>
                    onChange({
                      passwordConfirm: e.target.value.slice(0, 15),
                    })
                  }
                  invalid={passwordMismatch}
                  className="max-w-xs"
                />
                {passwordMismatch && (
                  <p className="text-2xs font-bold text-danger">
                    비밀번호가 일치하지 않습니다.
                  </p>
                )}
              </div>
            </FormRow>
          </div>
        </FormSection>

        <FormSection title="연락처">
          <div>
            <FormRow label="이메일" required htmlFor="signup-email">
              <div className="flex w-full flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Input
                    id="signup-email"
                    ref={emailRef}
                    type="email"
                    value={data.email}
                    disabled={emailVerified}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="example@corebank.com"
                    className="max-w-xs"
                  />
                  {!emailVerified && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={issueEmailMutation.isPending}
                      onClick={sendEmailCode}
                    >
                      {issueEmailMutation.isPending
                        ? "발송 중"
                        : emailIssued
                          ? "재발송"
                          : "인증번호 발송"}
                    </Button>
                  )}
                  {emailVerified && (
                    <span className="text-xs font-bold whitespace-nowrap text-primary">
                      인증 완료
                    </span>
                  )}
                </div>

                {emailIssued && !emailVerified && (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
                    {emailIssuedCode && (
                      <span
                        className={`text-lg font-bold tracking-2 ${
                          emailExpired
                            ? "text-ink-faint line-through"
                            : "text-primary"
                        }`}
                        aria-label="발송된 이메일 인증번호"
                      >
                        {emailIssuedCode}
                      </span>
                    )}

                    <span
                      className={`text-base font-bold ${
                        emailExpired ? "text-ink-faint" : "text-ink"
                      }`}
                    >
                      {formatClock(emailRemaining)}
                    </span>

                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      value={emailCode}
                      onChange={(e) => {
                        setEmailCode(
                          e.target.value.replace(/\D/g, "").slice(0, 6),
                        )

                        if (emailError) {
                          setEmailError(null)
                        }
                      }}
                      placeholder="인증번호 6자리"
                      className="w-32 text-center tracking-3"
                      aria-label="이메일 인증번호 입력"
                    />

                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={verifyEmailMutation.isPending}
                      onClick={confirmEmailCode}
                    >
                      {verifyEmailMutation.isPending ? "확인 중" : "확인"}
                    </Button>
                  </div>
                )}

                {emailError && (
                  <p className="text-2xs font-bold text-danger">{emailError}</p>
                )}

                <p className="text-2xs text-ink-muted">
                  ※ 개발 환경에서는 이메일 발송 대신 발급된 인증번호가 화면에
                  표시될 수 있습니다.
                </p>
              </div>
            </FormRow>

            <FormRow label="휴대폰번호" required htmlFor="signup-phone">
              <div className="flex w-full flex-col gap-1">
                <Input
                  id="signup-phone"
                  ref={phoneRef}
                  inputMode="numeric"
                  value={formatPhone(data.phone)}
                  onChange={(e) =>
                    onChange({
                      phone: onlyDigits(e.target.value, 11),
                    })
                  }
                  placeholder="010-0000-0000"
                  className="max-w-xs"
                />

                <p className="text-2xs text-ink-muted">
                  ※ 별도의 휴대폰 본인인증은 진행하지 않습니다.
                </p>
              </div>
            </FormRow>
          </div>
        </FormSection>
      </StepLayout>

      <NoticeBoxFooter
        className="mt-8"
        items={[
          "아이디는 중복확인 후 사용할 수 있으며, 확인 후 값을 수정하면 재확인이 필요합니다.",
          "이메일 인증번호의 유효시간은 180초이며, 시간 내 확인해야 다음 단계로 진행할 수 있습니다.",
        ]}
      />

      <AlertDialog
        open={alert !== null}
        onClose={() => setAlert(null)}
        title="정보입력 안내"
        messages={alert ? [alert] : []}
      />

      <AlertDialog
        open={dupAlert !== null}
        onClose={() => setDupAlert(null)}
        title="아이디 중복확인"
        messages={dupAlert ? [dupAlert] : []}
      />

      <ConfirmDialog
        open={dupConfirmOpen}
        onClose={() => {
          setDupConfirmOpen(false)
          setPendingIdCheck(null)
        }}
        onConfirm={confirmId}
        title="아이디 중복확인"
        messages={["사용가능한 ID입니다. 사용하시겠습니까?"]}
        confirmLabel="사용하기"
      />
    </>
  )
}
