import * as React from "react"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Alert } from "@/shared/ui/alert"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { ErrorDialog } from "@/shared/ui/error-dialog"
import {
  formatDateTime,
  maskBirthDate,
  maskEmail,
  maskName,
  maskPhone,
  maskUserId,
  formatPhone,
} from "@/shared/lib/format"
import { cn } from "@/shared/lib/utils"
import { onlyDigits } from "@/shared/lib/input-filter"
import { MOCK_NOW as BASE_TIME } from "@/shared/config/mock-clock"
import { EMAIL_CODE_TTL_SECONDS } from "@/shared/config/policy"
import { formatClock, useCountdown } from "@/shared/lib/hooks/use-countdown"
import { MOCK_PROFILE, MOCK_REGISTERED_EMAILS } from "@/entities/customer"

const PASSWORD_MIN = 8
const PASSWORD_MAX = 15
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/** POL-010·011: 8~15자 / 4종 중 3종 이상, 아이디 포함 금지, 동일문자·연속증감 4자리 금지. */
function validateLoginPassword(pw: string, userId: string): string | null {
  if (pw.length < PASSWORD_MIN || pw.length > PASSWORD_MAX) {
    return `비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자로 입력하세요.`
  }
  let classes = 0
  if (/[A-Z]/.test(pw)) classes++
  if (/[a-z]/.test(pw)) classes++
  if (/[0-9]/.test(pw)) classes++
  if (/[^A-Za-z0-9]/.test(pw)) classes++
  if (classes < 3) {
    return "영문 대문자·소문자·숫자·특수문자 중 3종 이상을 조합하세요."
  }
  if (userId && pw.toLowerCase().includes(userId.toLowerCase())) {
    return "비밀번호에 아이디를 포함할 수 없습니다."
  }
  if (/(.)\1{3,}/.test(pw)) {
    return "동일한 문자를 4자리 이상 연속으로 사용할 수 없습니다."
  }
  for (let i = 0; i <= pw.length - 4; i++) {
    const chunk = pw.slice(i, i + 4)
    if (!/^\d{4}$/.test(chunk)) continue
    const digits = chunk.split("").map(Number)
    const asc = digits.every((d, idx) => idx === 0 || d === digits[idx - 1] + 1)
    const desc = digits.every(
      (d, idx) => idx === 0 || d === digits[idx - 1] - 1,
    )
    if (asc || desc) {
      return "연속으로 증가·감소하는 숫자를 4자리 이상 사용할 수 없습니다."
    }
  }
  return null
}

/**
 * F-01 고객정보 조회/변경. 조회(REQ-MYPG-001) · 변경(REQ-MYPG-002) · 로그인
 * 비밀번호 변경(REQ-MYPG-003) 3개 FormSection으로 구성한다. 주소 등 정의되지
 * 않은 항목은 다루지 않는다.
 */
export const F01Profile = () => {
  const [profile, setProfile] = React.useState(MOCK_PROFILE)

  // ② 고객정보 변경 -------------------------------------------------------
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

  const handleEmailDraftChange = (value: string) => {
    setEmailDraft(value)
    resetEmailCode()
    if (infoError) setInfoError(null)
  }

  const handleSendCode = () => {
    const trimmed = emailDraft.trim()
    if (!EMAIL_PATTERN.test(trimmed)) {
      setInfoError("이메일 형식을 확인하세요.")
      return
    }
    if (
      MOCK_REGISTERED_EMAILS.some(
        (e) => e.toLowerCase() === trimmed.toLowerCase(),
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

  const resetInfoDraft = () => {
    setPhoneDraft(profile.phone)
    setEmailDraft(profile.email)
    setVerifiedEmail(profile.email)
    resetEmailCode()
    setInfoError(null)
  }

  const handleInfoSubmit = () => {
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
    setProfile((prev) => ({ ...prev, phone: phoneDraft, email: trimmedEmail }))
    setVerifiedEmail(trimmedEmail)
    resetEmailCode()
    setInfoSuccess("고객정보가 변경되었습니다.")
  }

  // ③ 로그인 비밀번호 변경 --------------------------------------------------
  const [currentPw, setCurrentPw] = React.useState("")
  const [newPw, setNewPw] = React.useState("")
  const [confirmPw, setConfirmPw] = React.useState("")
  const [pwError, setPwError] = React.useState<string | null>(null)
  const [pwConfirmOpen, setPwConfirmOpen] = React.useState(false)
  const [pwErrorDialog, setPwErrorDialog] = React.useState<string[] | null>(
    null,
  )
  const [pwSuccess, setPwSuccess] = React.useState<string | null>(null)

  const resetPwDraft = () => {
    setCurrentPw("")
    setNewPw("")
    setConfirmPw("")
    setPwError(null)
  }

  const handlePwSubmitClick = () => {
    setPwSuccess(null)
    if (currentPw.length === 0) {
      setPwError("현재 비밀번호를 입력하세요.")
      return
    }
    const ruleError = validateLoginPassword(newPw, profile.userId)
    if (ruleError) {
      setPwError(ruleError)
      return
    }
    if (newPw !== confirmPw) {
      setPwError("신규 비밀번호와 신규 비밀번호 확인이 일치하지 않습니다.")
      return
    }
    if (newPw === currentPw) {
      setPwError("현재 비밀번호와 동일한 값으로 변경할 수 없습니다.")
      return
    }
    setPwError(null)
    setPwConfirmOpen(true)
  }

  const handlePwConfirm = () => {
    setPwConfirmOpen(false)
    if (currentPw !== profile.currentPassword) {
      setPwErrorDialog(["현재 비밀번호가 일치하지 않습니다."])
      setCurrentPw("")
      return
    }
    setProfile((prev) => ({ ...prev, currentPassword: newPw }))
    resetPwDraft()
    setPwSuccess(
      "로그인 비밀번호가 변경되었습니다. 다음 로그인부터 신규 비밀번호가 적용됩니다.",
    )
  }

  return (
    <QueryPageLayout
      noticeItems={[
        "이 화면에서는 휴대폰번호와 이메일 주소만 변경할 수 있습니다. 주소 등 그 외 정보는 변경할 수 없습니다.",
        "이메일을 변경하면 신규 이메일로 인증번호를 재발송해 확인해야 저장됩니다.",
        "로그인 비밀번호는 현재 비밀번호 확인 후에만 변경할 수 있습니다.",
      ]}
      footerItems={[
        "고객정보 조회 항목 중 성명·아이디·생년월일·휴대폰번호·이메일은 마스킹되어 표시됩니다(REQ-MYPG-001).",
        "이메일 변경은 신규 이메일 인증번호 확인 완료 후에만 저장되며, 이미 가입된 이메일로는 변경할 수 없습니다(REQ-MYPG-002).",
        "로그인 비밀번호는 8~15자, 4종 중 3종 이상 조합이며 직전 비밀번호와 동일한 값은 사용할 수 없습니다(REQ-AUTH-011·012·034).",
      ]}
      modals={
        <>
          <ConfirmDialog
            open={pwConfirmOpen}
            onClose={() => setPwConfirmOpen(false)}
            onConfirm={handlePwConfirm}
            title="로그인 비밀번호 변경"
            messages={[
              "현재 비밀번호를 확인한 뒤 신규 비밀번호로 변경합니다.",
              "확인을 누르면 즉시 적용됩니다.",
            ]}
            confirmLabel="변경하기"
            items={[{ label: "대상 아이디", value: profile.userId }]}
          />

          <ErrorDialog
            open={pwErrorDialog != null}
            onClose={() => setPwErrorDialog(null)}
            title="비밀번호 변경 실패"
            messages={pwErrorDialog ?? []}
          />
        </>
      }
    >
      <FormSection title="고객정보 조회">
        <div>
          <FormRow label="성명" labelWidth={180}>
            <span className="text-ink">{maskName(profile.name)}</span>
          </FormRow>
          <FormRow label="아이디" labelWidth={180}>
            <span className="text-ink tabular-nums">
              {maskUserId(profile.userId)}
            </span>
          </FormRow>
          <FormRow label="생년월일" labelWidth={180}>
            <span className="text-ink tabular-nums">
              {maskBirthDate(profile.dob)}
            </span>
          </FormRow>
          <FormRow label="휴대폰번호" labelWidth={180}>
            <span className="text-ink tabular-nums">
              {maskPhone(profile.phone)}
            </span>
          </FormRow>
          <FormRow label="이메일" labelWidth={180}>
            <span className="text-ink">{maskEmail(profile.email)}</span>
          </FormRow>
        </div>
        <p className="mt-2 text-right text-2xs text-ink-muted tabular-nums">
          기준일시 : {formatDateTime(BASE_TIME)}
        </p>
      </FormSection>

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
              onChange={(e) => {
                setPhoneDraft(onlyDigits(e.target.value, 11))
                if (infoError) setInfoError(null)
              }}
              className="max-w-[180px] tabular-nums"
            />
            {phoneDraft.length === 11 && (
              <span className="text-base text-ink-muted tabular-nums">
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
                  onChange={(e) => handleEmailDraftChange(e.target.value)}
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
                      "text-lg font-bold tracking-15 tabular-nums",
                      codeExpired
                        ? "text-ink-faint line-through"
                        : "text-primary",
                    )}
                  >
                    {issuedCode}
                  </span>
                  <span className="text-base font-bold text-ink tabular-nums">
                    {formatClock(codeRemaining)}
                  </span>
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="인증번호 6자리"
                    value={codeInput}
                    disabled={codeExpired || emailVerifiedForDraft}
                    onChange={(e) => {
                      setCodeInput(
                        e.target.value.replace(/\D/g, "").slice(0, 6),
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
            onClick={resetInfoDraft}
          >
            초기화
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="min-w-30"
            onClick={handleInfoSubmit}
          >
            변경하기
          </Button>
        </div>
      </FormSection>

      {pwSuccess && <Alert variant="success">{pwSuccess}</Alert>}

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
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
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
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
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
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="max-w-xs"
            />
          </FormRow>
        </div>
        <p className="mt-2 text-2xs text-ink-muted">
          ※ 비밀번호는 {PASSWORD_MIN}~{PASSWORD_MAX}자, 영문
          대문자·소문자·숫자·특수문자 중 3종 이상 조합이며 아이디 포함, 동일문자
          4자리 연속, 연속 증감 숫자 4자리는 사용할 수 없습니다.
        </p>

        {pwError && (
          <p role="alert" className="mt-2 text-base font-bold text-danger">
            {pwError}
          </p>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Button
            variant="secondary"
            size="lg"
            className="min-w-30"
            onClick={resetPwDraft}
          >
            초기화
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="min-w-30"
            onClick={handlePwSubmitClick}
          >
            변경하기
          </Button>
        </div>
      </FormSection>
    </QueryPageLayout>
  )
}
