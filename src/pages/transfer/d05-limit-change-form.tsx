import * as React from "react"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Select } from "@/shared/ui/select"
import { Alert } from "@/shared/ui/alert"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { OtpModal, OtpTransactionType } from "@/entities/auth"
import { AccountPasswordField } from "@/widgets/transfer"
import { formatAccountNo, formatAmount } from "@/shared/lib/format"
import { onlyDigits as onlyDigitsBase } from "@/shared/lib/input-filter"
import {
  TRANSFER_LIMIT_PER_DAY_MAX as PER_DAY_MAX,
  TRANSFER_LIMIT_PER_TRANSFER_MAX as PER_TRANSFER_MAX,
} from "@/shared/config/policy"
import { validateLimitChangeDraft } from "@/pages/transfer/d05-limit-validation"
import { useD05LimitChange } from "@/pages/transfer/use-d05-limit-change"

const AMOUNT_INPUT_MAX_DIGITS = 15

const onlyDigits = (value: string): string =>
  onlyDigitsBase(value, AMOUNT_INPUT_MAX_DIGITS)

const formatDraft = (value: string): string => {
  if (!value) return ""
  return Number(value).toLocaleString("ko-KR")
}

type Props = {
  oneTimeLimit: number
  dailyLimit: number
  isLimitUnavailable: boolean
  onSuccessMessageChange: (message: string | null) => void
}

/**
 * D-05 이체한도 변경(REQ-TRSF-025). 한도 입력과 계좌비밀번호 확인 입력을 받고
 * 확인 → 계좌비밀번호 → OTP 순서로 인증을 태운다.
 *
 * 입력 검증은 `d05-limit-validation` 이, 인증·멱등키는 `useD05LimitChange` 가
 * 담당한다. 이 컴포넌트는 입력 상태와 화면 조립만 가진다.
 */
export const D05LimitChangeForm = ({
  oneTimeLimit,
  dailyLimit,
  isLimitUnavailable,
  onSuccessMessageChange,
}: Props) => {
  const [perTransferDraft, setPerTransferDraft] = React.useState<string | null>(
    null,
  )
  const [perDayDraft, setPerDayDraft] = React.useState<string | null>(null)
  const [fieldError, setFieldError] = React.useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const change = useD05LimitChange({
    onChanged: () => {
      setPerTransferDraft(null)
      setPerDayDraft(null)
      setFieldError(null)
      onSuccessMessageChange(
        "이체한도가 변경되었습니다. 다음 이체부터 신규 한도가 적용됩니다.",
      )
    },
  })

  const perTransferInput = perTransferDraft ?? String(oneTimeLimit || "")
  const perDayInput = perDayDraft ?? String(dailyLimit || "")
  const perTransferValue = Number(perTransferInput || 0)
  const perDayValue = Number(perDayInput || 0)

  const handleReset = () => {
    setPerTransferDraft(null)
    setPerDayDraft(null)
    setFieldError(null)
    change.reset()
  }

  const handleSubmitClick = () => {
    onSuccessMessageChange(null)
    change.clearErrors()
    const validation = validateLimitChangeDraft({
      oneTimeLimit: perTransferValue,
      dailyLimit: perDayValue,
      accountNo: change.selectedAccountNo,
      accountPassword: change.accountPassword,
    })
    if (!validation.ok) {
      setFieldError(validation.reason)
      return
    }
    setFieldError(null)
    setConfirmOpen(true)
  }

  const handleConfirm = () => {
    setConfirmOpen(false)
    void change.startAuth({
      oneTimeLimit: perTransferValue,
      dailyLimit: perDayValue,
    })
  }

  const submitLabel = (() => {
    if (change.isChanging) return "변경 중..."
    if (change.isVerifying) return "인증 중..."
    return "변경하기"
  })()

  return (
    <>
      <FormSection title="이체한도 변경" className="mb-0">
        <div>
          <FormRow
            label="신규 1회 이체한도"
            required
            htmlFor="d05-per-transfer"
            labelWidth={200}
          >
            <Input
              id="d05-per-transfer"
              inputMode="numeric"
              disabled={isLimitUnavailable}
              value={formatDraft(perTransferInput)}
              onChange={(e) => setPerTransferDraft(onlyDigits(e.target.value))}
              className="max-w-[220px] text-right"
            />
            <span className="shrink-0 text-base text-ink-muted">원</span>
          </FormRow>
          <FormRow
            label="신규 1일 이체한도"
            required
            htmlFor="d05-per-day"
            labelWidth={200}
          >
            <Input
              id="d05-per-day"
              inputMode="numeric"
              disabled={isLimitUnavailable}
              value={formatDraft(perDayInput)}
              onChange={(e) => setPerDayDraft(onlyDigits(e.target.value))}
              className="max-w-[220px] text-right"
            />
            <span className="shrink-0 text-base text-ink-muted">원</span>
          </FormRow>
        </div>
        <p className="mt-2 text-2xs text-ink-muted">
          ※ 1회 한도는 최대 {formatAmount(PER_TRANSFER_MAX)}, 1일 한도는 최대{" "}
          {formatAmount(PER_DAY_MAX)}까지 변경할 수 있으며, 1회 한도는 1일
          한도를 초과할 수 없습니다.
        </p>

        <div className="mt-4 border-t border-border pt-4">
          <FormRow
            label="계좌비밀번호 확인 계좌"
            required
            htmlFor="d05-auth-account"
            labelWidth={200}
          >
            <div className="max-w-md min-w-0 flex-1">
              <Select
                id="d05-auth-account"
                disabled={change.isAccountUnavailable}
                value={change.selectedAccountNo}
                onChange={(e) => change.selectAccount(e.target.value)}
              >
                <option value="">계좌를 선택하세요</option>
                {change.accounts.map((account) => (
                  <option
                    key={account.accountId}
                    value={account.accountNumber ?? ""}
                  >
                    {`${account.accountName ?? ""} / ${formatAccountNo(account.accountNumber ?? "")}`}
                  </option>
                ))}
              </Select>
            </div>
          </FormRow>
          <FormRow
            label="계좌비밀번호"
            required
            htmlFor="d05-auth-password"
            labelWidth={200}
          >
            <AccountPasswordField
              id="d05-auth-password"
              value={change.accountPassword}
              onChange={change.changePassword}
            />
          </FormRow>
        </div>
        <p className="mt-2 text-2xs text-ink-muted">
          ※ 이체한도는 고객 단위로 적용됩니다. 위 계좌는 본인 확인에만 사용하며,
          변경된 한도는 보유 계좌 전체에 반영됩니다.
        </p>

        {change.accountNotice != null &&
          (change.isAccountsLoading ? (
            <p className="mt-2 text-base text-ink-muted">
              {change.accountNotice}
            </p>
          ) : (
            <Alert variant="danger" className="mt-2">
              {change.accountNotice}
            </Alert>
          ))}

        {change.authError && (
          <p role="alert" className="mt-2 text-base font-bold text-danger">
            {change.authError}
          </p>
        )}

        {fieldError && (
          <p role="alert" className="mt-2 text-base font-bold text-danger">
            {fieldError}
          </p>
        )}

        {change.changeError && (
          <p role="alert" className="mt-2 text-base font-bold text-danger">
            {change.changeError}
          </p>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Button
            variant="secondary"
            size="lg"
            className="min-w-30"
            disabled={isLimitUnavailable}
            onClick={handleReset}
          >
            초기화
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="min-w-30"
            disabled={
              isLimitUnavailable ||
              change.isAccountUnavailable ||
              change.isVerifying ||
              change.isChanging
            }
            onClick={handleSubmitClick}
          >
            {submitLabel}
          </Button>
        </div>
      </FormSection>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="이체한도 변경"
        messages={[
          "아래 내용으로 이체한도를 변경합니다.",
          "확인 후 계좌비밀번호 확인과 OTP 인증을 거쳐 적용됩니다.",
        ]}
        confirmLabel="다음"
        items={[
          { label: "신규 1회 이체한도", value: formatAmount(perTransferValue) },
          { label: "신규 1일 이체한도", value: formatAmount(perDayValue) },
          {
            label: "계좌비밀번호 확인 계좌",
            value: formatAccountNo(change.selectedAccountNo),
          },
        ]}
      />

      {change.keyedLimits != null && (
        <OtpModal
          open={change.isOtpOpen}
          onClose={change.closeOtp}
          onConfirm={(otpAuthToken) => void change.submit(otpAuthToken)}
          transaction={{
            type: OtpTransactionType.TRANSFER_LIMIT_CHANGE,
            data: change.keyedLimits,
          }}
          title="이체한도 변경 OTP 인증"
          guide="이체한도 변경을 위해 OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하세요."
        />
      )}
    </>
  )
}
