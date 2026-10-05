import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Select } from "@/shared/ui/select"
import { Alert } from "@/shared/ui/alert"
import { SummaryRow } from "@/shared/ui/summary-row"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { OtpModal, OtpTransactionType } from "@/entities/auth"
import { AccountPasswordField } from "@/widgets/transfer"
import {
  useAccountPasswordVerification,
  useWithdrawAccounts,
} from "@/entities/account"
import {
  formatAccountNo,
  formatAmount,
  formatDateTime,
} from "@/shared/lib/format"
import { onlyDigits as onlyDigitsBase } from "@/shared/lib/input-filter"
import {
  getTransferLimitQueryKey,
  useTransferLimitQuery,
  useUpdateTransferLimitMutation,
} from "@/entities/transfer"
import { ApiError, toErrorMessage } from "@/shared/api/api-error"
import {
  TRANSFER_LIMIT_PER_DAY_MAX as PER_DAY_MAX,
  TRANSFER_LIMIT_PER_TRANSFER_MAX as PER_TRANSFER_MAX,
} from "@/shared/config/policy"
import { useBaseTime } from "@/shared/lib/hooks/use-base-time"

const ACCOUNT_PASSWORD_LENGTH = 4

const onlyDigits = (value: string): string => {
  return onlyDigitsBase(value, 15)
}

const formatDraft = (value: string): string => {
  if (!value) return ""
  return Number(value).toLocaleString("ko-KR")
}

/**
 * D-05 이체한도 조회/변경. 조회(REQ-TRSF-024)와 변경(REQ-TRSF-025)을 한 화면에서
 * 제공한다.
 *
 * 변경은 계좌비밀번호 확인과 OTP 인증을 모두 거친다(서버 `api_conventions.md` §8-2).
 * 한도는 고객 단위 자원이지만 계좌비밀번호 인증 토큰은 계좌에 묶이므로, 인증할 계좌를
 * 사용자가 고른다.
 *
 * 실물 보안매체는 제공하지 않고 Mock OTP 로 대체한다(EX-010).
 */
export const D05TransferLimit = () => {
  const BASE_TIME = useBaseTime()
  const queryClient = useQueryClient()
  const {
    data: limit,
    isLoading,
    isError,
    error: queryError,
  } = useTransferLimitQuery()
  const updateMutation = useUpdateTransferLimitMutation()
  const {
    accounts: authAccounts,
    isLoading: isAccountsLoading,
    isError: isAccountsError,
    error: accountsError,
  } = useWithdrawAccounts()
  const passwordVerification = useAccountPasswordVerification()

  const oneTimeLimit = limit?.oneTimeLimit ?? 0
  const dailyLimit = limit?.dailyLimit ?? 0
  const isLimitUnavailable = isLoading || isError || limit == null
  /** 인증할 계좌를 고를 수 없으면 계좌비밀번호 토큰을 못 받아 변경 자체가 불가능하다. */
  const isAuthAccountUnavailable =
    isAccountsLoading || isAccountsError || authAccounts.length === 0
  /**
   * 계좌를 고를 수 없는 이유. 로딩과 실패를 한 문구로 뭉개면 "조회에 실패했다"가
   * 불러오는 중에도 뜬다. 실패 문구는 서버가 준 것을 그대로 쓴다(REQ-CMN-008).
   */
  const authAccountNotice = isAccountsLoading
    ? "계좌 목록을 불러오는 중입니다."
    : isAccountsError
      ? toErrorMessage(accountsError)
      : authAccounts.length === 0
        ? "계좌비밀번호를 확인할 수 있는 이체 가능 계좌가 없어 한도를 변경할 수 없습니다."
        : null

  const [perTransferDraft, setPerTransferDraft] = React.useState<string | null>(
    null,
  )
  const [perDayDraft, setPerDayDraft] = React.useState<string | null>(null)
  const [fieldError, setFieldError] = React.useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [otpOpen, setOtpOpen] = React.useState(false)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  )
  const [selectedAccountNo, setSelectedAccountNo] = React.useState("")
  const [accountPassword, setAccountPassword] = React.useState("")
  const [authError, setAuthError] = React.useState<string | null>(null)
  const [passwordAuthToken, setPasswordAuthToken] = React.useState<
    string | null
  >(null)
  const [idempotencyKey, setIdempotencyKey] = React.useState("")
  /** 멱등키를 발급할 때의 한도값. 한도가 달라지면 다른 거래라 키를 새로 만든다. */
  const [keyedLimits, setKeyedLimits] = React.useState<{
    oneTimeLimit: number
    dailyLimit: number
  } | null>(null)

  const perTransferInput = perTransferDraft ?? String(oneTimeLimit || "")
  const perDayInput = perDayDraft ?? String(dailyLimit || "")
  const perTransferValue = Number(perTransferInput || 0)
  const perDayValue = Number(perDayInput || 0)

  /**
   * 폼을 비운다. 멱등키는 여기서만 버린다 — 실패한 변경을 같은 한도로 다시 보낼 때는
   * 같은 키를 써야 서버가 앞선 요청과 한 거래로 묶는다(REQ-CMN-014).
   */
  const resetDraft = () => {
    setPerTransferDraft(null)
    setPerDayDraft(null)
    setFieldError(null)
    setAuthError(null)
    setAccountPassword("")
    setPasswordAuthToken(null)
    setIdempotencyKey("")
    setKeyedLimits(null)
  }

  const handleSubmitClick = () => {
    setSuccessMessage(null)
    setAuthError(null)
    if (!perTransferInput || perTransferValue <= 0) {
      setFieldError("1회 이체한도를 입력하세요.")
      return
    }
    if (!perDayInput || perDayValue <= 0) {
      setFieldError("1일 이체한도를 입력하세요.")
      return
    }
    if (perTransferValue > PER_TRANSFER_MAX) {
      setFieldError(
        `1회 이체한도는 최대 ${formatAmount(PER_TRANSFER_MAX)}까지 변경할 수 있습니다.`,
      )
      return
    }
    if (perDayValue > PER_DAY_MAX) {
      setFieldError(
        `1일 이체한도는 최대 ${formatAmount(PER_DAY_MAX)}까지 변경할 수 있습니다.`,
      )
      return
    }
    if (perTransferValue > perDayValue) {
      setFieldError("1회 이체한도는 1일 이체한도를 초과할 수 없습니다.")
      return
    }
    if (!selectedAccountNo) {
      setFieldError("계좌비밀번호를 확인할 계좌를 선택하세요.")
      return
    }
    if (accountPassword.length !== ACCOUNT_PASSWORD_LENGTH) {
      setFieldError(`계좌비밀번호 ${ACCOUNT_PASSWORD_LENGTH}자리를 입력하세요.`)
      return
    }
    setFieldError(null)
    setConfirmOpen(true)
  }

  /** 계좌비밀번호를 확인해 토큰을 받고 OTP 로 넘긴다(§8-2 ①). */
  const handleConfirm = async () => {
    setConfirmOpen(false)
    const account = authAccounts.find(
      (a) => a.accountNumber === selectedAccountNo,
    )
    if (account?.accountId == null) {
      setAuthError("선택한 계좌를 찾을 수 없습니다. 계좌를 다시 선택하세요.")
      return
    }

    const verified = await passwordVerification.verify({
      accountId: account.accountId,
      accountPassword,
      clearPassword: () => setAccountPassword(""),
    })
    if (!verified.ok) {
      setPasswordAuthToken(null)
      setAuthError(verified.message)
      return
    }

    setPasswordAuthToken(verified.token)
    setAuthError(null)
    const isSameLimitsAsKey =
      keyedLimits != null &&
      keyedLimits.oneTimeLimit === perTransferValue &&
      keyedLimits.dailyLimit === perDayValue
    if (!isSameLimitsAsKey) {
      setIdempotencyKey(crypto.randomUUID())
      setKeyedLimits({
        oneTimeLimit: perTransferValue,
        dailyLimit: perDayValue,
      })
    }
    setOtpOpen(true)
  }

  const handleOtpConfirm = async (otpAuthToken: string) => {
    setOtpOpen(false)
    if (passwordAuthToken == null) {
      setAuthError(
        "계좌비밀번호 확인 정보가 없습니다. 계좌비밀번호부터 다시 확인하세요.",
      )
      return
    }
    try {
      await updateMutation.mutateAsync({
        oneTimeLimit: perTransferValue,
        dailyLimit: perDayValue,
        accountPasswordAuthToken: passwordAuthToken,
        otpAuthToken,
        idempotencyKey,
      })
      await queryClient.invalidateQueries({
        queryKey: getTransferLimitQueryKey(),
      })
      resetDraft()
      setSuccessMessage(
        "이체한도가 변경되었습니다. 다음 이체부터 신규 한도가 적용됩니다.",
      )
    } catch (error) {
      setFieldError(
        error instanceof ApiError
          ? error.message
          : "이체한도 변경에 실패했습니다.",
      )
    } finally {
      // 두 토큰은 서버가 이미 소비했고 되살아나지 않는다. 남은 것을 버려 다음 시도가
      // 계좌비밀번호 확인부터 다시 시작하게 한다(§6-3 복수 인증 토큰 소비 실패).
      setPasswordAuthToken(null)
      setAccountPassword("")
    }
  }

  return (
    <QueryPageLayout
      noticeItems={[
        "1회 이체한도와 1일 이체한도는 각각 정책 최대치 이내에서 변경할 수 있습니다.",
        "1회 이체한도는 1일 이체한도를 초과할 수 없습니다.",
        "한도 변경 시 계좌비밀번호 확인과 OTP 인증이 모두 필요합니다.",
      ]}
      footerItems={[
        "당일 사용금액과 잔여 이체가능금액은 이체 실행 즉시 갱신됩니다(REQ-TRSF-024).",
        `한도 변경은 1회 최대 ${formatAmount(PER_TRANSFER_MAX)}, 1일 최대 ${formatAmount(PER_DAY_MAX)} 이내에서만 가능하며 계좌비밀번호 확인과 OTP 인증을 거쳐야 적용됩니다(REQ-TRSF-025).`,
        "이체한도는 고객 단위로 적용되며, 계좌비밀번호 확인에 사용한 계좌와 무관하게 전체 계좌에 반영됩니다.",
        "변경에 실패하면 계좌비밀번호 확인과 OTP 인증을 처음부터 다시 받습니다.",
        "보안카드·OTP 실물매체 등 별도의 보안매체는 제공하지 않고 Mock OTP로 대체합니다(EX-010).",
      ]}
      modals={
        <>
          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => void handleConfirm()}
            title="이체한도 변경"
            messages={[
              "아래 내용으로 이체한도를 변경합니다.",
              "확인 후 계좌비밀번호 확인과 OTP 인증을 거쳐 적용됩니다.",
            ]}
            confirmLabel="다음"
            items={[
              {
                label: "신규 1회 이체한도",
                value: formatAmount(perTransferValue),
              },
              { label: "신규 1일 이체한도", value: formatAmount(perDayValue) },
              {
                label: "계좌비밀번호 확인 계좌",
                value: formatAccountNo(selectedAccountNo),
              },
            ]}
          />

          <OtpModal
            open={otpOpen}
            onClose={() => setOtpOpen(false)}
            onConfirm={(otpAuthToken) => void handleOtpConfirm(otpAuthToken)}
            transaction={{
              type: OtpTransactionType.TRANSFER_LIMIT_CHANGE,
              data: { oneTimeLimit: perTransferValue, dailyLimit: perDayValue },
            }}
            title="이체한도 변경 OTP 인증"
            guide="이체한도 변경을 위해 OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하세요."
          />
        </>
      }
    >
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      <FormSection title="이체한도 조회">
        {isLoading && (
          <p className="py-10 text-center text-base text-ink-muted">
            불러오는 중...
          </p>
        )}

        {!isLoading && (isError || limit == null) && (
          <Alert variant="danger">
            {queryError instanceof ApiError
              ? queryError.message
              : "이체한도를 조회하지 못했습니다. 잠시 후 다시 시도하세요."}
          </Alert>
        )}

        {!isLimitUnavailable && (
          <>
            <SummaryRow
              items={[
                {
                  label: "1회 이체한도",
                  value: formatAmount(oneTimeLimit),
                },
                { label: "1일 이체한도", value: formatAmount(dailyLimit) },
                {
                  label: "당일 사용금액",
                  value: formatAmount(limit?.dailyUsedAmount ?? 0),
                },
              ]}
            />
            <div className="mt-4 flex flex-col items-end gap-1 border-t-2 border-t-navy pt-3">
              <span className="font-normal text-ink-muted">
                당일 잔여 이체가능금액
              </span>
              <span className="text-page font-bold text-primary">
                {formatAmount(limit?.dailyRemainingAmount ?? 0)}
              </span>
            </div>
            <p className="mt-2 text-right text-2xs text-ink-muted">
              기준일시 : {formatDateTime(BASE_TIME)}
            </p>
          </>
        )}
      </FormSection>

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
                disabled={isAuthAccountUnavailable}
                value={selectedAccountNo}
                onChange={(e) => {
                  setSelectedAccountNo(e.target.value)
                  setAuthError(null)
                  setPasswordAuthToken(null)
                }}
              >
                <option value="">계좌를 선택하세요</option>
                {authAccounts.map((account) => (
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
              value={accountPassword}
              onChange={(value) => {
                setAccountPassword(value)
                setAuthError(null)
              }}
            />
          </FormRow>
        </div>
        <p className="mt-2 text-2xs text-ink-muted">
          ※ 이체한도는 고객 단위로 적용됩니다. 위 계좌는 본인 확인에만 사용하며,
          변경된 한도는 보유 계좌 전체에 반영됩니다.
        </p>

        {authAccountNotice != null &&
          (isAccountsLoading ? (
            <p className="mt-2 text-base text-ink-muted">{authAccountNotice}</p>
          ) : (
            <Alert variant="danger" className="mt-2">
              {authAccountNotice}
            </Alert>
          ))}

        {authError && (
          <p role="alert" className="mt-2 text-base font-bold text-danger">
            {authError}
          </p>
        )}

        {fieldError && (
          <p role="alert" className="mt-2 text-base font-bold text-danger">
            {fieldError}
          </p>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Button
            variant="secondary"
            size="lg"
            className="min-w-30"
            disabled={isLimitUnavailable}
            onClick={resetDraft}
          >
            초기화
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="min-w-30"
            disabled={
              isLimitUnavailable ||
              isAuthAccountUnavailable ||
              passwordVerification.isPending ||
              updateMutation.isPending
            }
            onClick={handleSubmitClick}
          >
            {updateMutation.isPending
              ? "변경 중..."
              : passwordVerification.isPending
                ? "인증 중..."
                : "변경하기"}
          </Button>
        </div>
      </FormSection>
    </QueryPageLayout>
  )
}
