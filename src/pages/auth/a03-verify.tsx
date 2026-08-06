import * as React from "react"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { StepLayout } from "@/shared/ui/step-layout"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { AlertDialog } from "@/shared/ui/alert-dialog"
import { ErrorDialog } from "@/shared/ui/error-dialog"
import { MOCK_SIGNUP_ACCOUNTS, type VerifyAccount } from "@/entities/auth"
import { onlyDigits } from "@/shared/lib/input-filter"
import { ACCOUNT_PASSWORD_ERROR_LIMIT as ERROR_LIMIT } from "@/shared/config/policy"
import { SIGNUP_STEPS } from "@/pages/auth/signup-shared"

type A03VerifyProps = {
  onVerified: (name: string, birth: string) => void
}

/** A-03 회원가입 2단계 · 본인확인(계좌 실명확인). REQ-AUTH-005·006·007. */
export const A03Verify = ({ onVerified }: A03VerifyProps) => {
  const [accounts, setAccounts] =
    React.useState<VerifyAccount[]>(MOCK_SIGNUP_ACCOUNTS)
  const [name, setName] = React.useState("")
  const [birth, setBirth] = React.useState("")
  const [accountNo, setAccountNo] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [alert, setAlert] = React.useState<string | null>(null)
  const [blocked, setBlocked] = React.useState<string[] | null>(null)

  const nameRef = React.useRef<HTMLInputElement>(null)
  const birthRef = React.useRef<HTMLInputElement>(null)
  const accountRef = React.useRef<HTMLInputElement>(null)
  const passwordRef = React.useRef<HTMLInputElement>(null)

  const handleVerify = () => {
    if (name.trim().length === 0) {
      setAlert("성명을 입력하세요.")
      nameRef.current?.focus()
      return
    }
    if (birth.length !== 6) {
      setAlert("생년월일 6자리(YYMMDD)를 입력하세요.")
      birthRef.current?.focus()
      return
    }
    if (accountNo.length !== 12) {
      setAlert("당행 계좌번호 12자리를 입력하세요.")
      accountRef.current?.focus()
      return
    }
    if (password.length !== 4) {
      setAlert("계좌비밀번호 4자리를 입력하세요.")
      passwordRef.current?.focus()
      return
    }

    const account = accounts.find((a) => a.accountNo === accountNo)
    if (!account) {
      setAlert(
        "입력하신 계좌번호를 찾을 수 없습니다. 계좌번호를 다시 확인해 주세요.",
      )
      return
    }
    if (account.status === "거래정지") {
      setBlocked([
        "누적 오류로 거래정지된 계좌입니다.",
        "영업점 또는 고객센터에서 거래정지 해제 후 다시 시도하세요.",
      ])
      return
    }
    if (account.ownerName !== name.trim() || account.birth !== birth) {
      setAlert("입력하신 성명·생년월일이 계좌 소유자 정보와 일치하지 않습니다.")
      return
    }
    if (account.accountPassword !== password) {
      const nextCount = account.errorCount + 1
      const isBlocked = nextCount >= ERROR_LIMIT
      setAccounts((prev) =>
        prev.map((a) =>
          a.accountNo === accountNo
            ? {
                ...a,
                errorCount: Math.min(nextCount, ERROR_LIMIT),
                status: isBlocked ? "거래정지" : a.status,
              }
            : a,
        ),
      )
      setPassword("")
      if (isBlocked) {
        setBlocked([
          "계좌비밀번호를 5회 연속 잘못 입력해 이 계좌가 거래정지 상태로 전환되었습니다.",
          "영업점 또는 고객센터에서 거래정지 해제 후 다시 시도하세요.",
        ])
      } else {
        setAlert(
          `계좌비밀번호가 일치하지 않습니다. (누적 오류 ${nextCount}/${ERROR_LIMIT}회)`,
        )
      }
      return
    }

    onVerified(account.ownerName, account.birth)
  }

  return (
    <>
      <StepLayout
        steps={SIGNUP_STEPS}
        currentStep={2}
        title="회원가입"
        notice={[
          "본인 명의의 당행 입출금계좌로 실명을 확인합니다.",
          "휴대폰 본인인증·ARS·i-PIN 등 외부 인증 수단은 제공하지 않습니다.",
        ]}
        footer={
          <Button
            variant="primary"
            size="lg"
            className="min-w-40"
            onClick={handleVerify}
          >
            다음
          </Button>
        }
      >
        <FormSection title="본인확인">
          <div>
            <FormRow label="성명" required htmlFor="signup-name">
              <Input
                id="signup-name"
                ref={nameRef}
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예금주 성명"
                className="max-w-xs"
              />
            </FormRow>
            <FormRow label="생년월일" required htmlFor="signup-birth">
              <div className="flex flex-col gap-1">
                <Input
                  id="signup-birth"
                  ref={birthRef}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  value={birth}
                  onChange={(e) => setBirth(onlyDigits(e.target.value, 6))}
                  placeholder="YYMMDD"
                  className="w-40 tracking-2"
                />
                <p className="text-2xs text-ink-muted">
                  ※ 주민등록번호 뒷자리는 수집하지 않습니다.
                </p>
              </div>
            </FormRow>
            <FormRow label="당행 계좌번호" required htmlFor="signup-account">
              <Input
                id="signup-account"
                ref={accountRef}
                inputMode="numeric"
                autoComplete="off"
                maxLength={12}
                value={accountNo}
                onChange={(e) => setAccountNo(onlyDigits(e.target.value, 12))}
                placeholder="하이픈 없이 12자리 숫자"
                className="max-w-xs tracking-1"
              />
            </FormRow>
            <FormRow label="계좌비밀번호" required htmlFor="signup-account-pw">
              <div className="flex flex-col gap-1">
                <Input
                  id="signup-account-pw"
                  ref={passwordRef}
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={password}
                  onChange={(e) => setPassword(onlyDigits(e.target.value, 4))}
                  className="w-32 text-center tracking-4"
                />
                <p className="text-2xs text-ink-muted">
                  ※ 계좌비밀번호를 5회 연속 잘못 입력하면 해당 계좌가 거래정지
                  상태로 전환됩니다.
                </p>
              </div>
            </FormRow>
          </div>
        </FormSection>
      </StepLayout>

      <NoticeBoxFooter
        className="mt-8"
        items={[
          "본인확인은 보유하신 당행 입출금계좌 정보로 진행합니다.",
          "계좌번호 실존 여부, 예금주 성명·생년월일, 계좌비밀번호 순으로 검증합니다.",
        ]}
      />

      <AlertDialog
        open={alert !== null}
        onClose={() => setAlert(null)}
        title="본인확인 안내"
        messages={alert ? [alert] : []}
      />
      <ErrorDialog
        open={blocked !== null}
        onClose={() => setBlocked(null)}
        title="본인확인 실패"
        messages={blocked ?? []}
      />
    </>
  )
}
