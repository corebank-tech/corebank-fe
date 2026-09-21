import * as React from "react"
import { useNavigate, useSearchParams } from "react-router"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { OtpModal, OtpTransactionType } from "@/entities/auth"
import { MOCK_TRANSFER_LIMITS, MOCK_PAYEE_NAME } from "@/entities/transfer"
import {
  formatAccountNo,
  formatAmount,
  formatDate,
  formatDateTime,
  maskName,
} from "@/shared/lib/format"
import { addMonths, daysBetween } from "@/shared/lib/date"
import { getToday } from "@/shared/config/clock"
import { getNow } from "@/shared/config/clock"
import { useBaseTime } from "@/shared/lib/hooks/use-base-time"
import { AUTO_TRANSFER_START_MAX_RANGE_DAYS } from "@/shared/config/policy"
import type { TransferCycleMonths } from "@/widgets/transfer"
import { TRANSFER_STEPS as STEPS } from "@/pages/transfer/transfer-steps"
import { AutoTransferStep1 } from "@/pages/transfer/auto/g01-input"
import { AutoTransferStep2 } from "@/pages/transfer/auto/g02-confirm"
import { AutoTransferStep3 } from "@/pages/transfer/auto/g03-complete"
import { useRegisterAutoTransferMutation } from "@/entities/transfer"
import {
  useVerifyAccountPasswordMutation,
  useWithdrawAccounts,
} from "@/entities/account"
import { ApiError } from "@/shared/api/api-error"
import { ErrorDialog } from "@/shared/ui/error-dialog"

export type AutoTransferForm = {
  fromAccount: string
  password: string
  toAccount: string
  toConfirmed: boolean
  amount: number | null
  cycleMonths: TransferCycleMonths
  dayOfMonth: number
  startDate: string
  endDate: string
  payeeMemo: string
  myMemo: string
}

const INITIAL_FORM: AutoTransferForm = {
  // 출금계좌는 GET /accounts 응답이 도착한 뒤 첫 계좌로 채워진다.
  fromAccount: "",
  password: "",
  toAccount: "",
  toConfirmed: false,
  amount: null,
  cycleMonths: 1,
  dayOfMonth: 25,
  startDate: "",
  endDate: "",
  payeeMemo: "",
  myMemo: "",
}

const toCycleMonths = (raw: string | null): TransferCycleMonths => {
  if (raw === "3") return 3
  if (raw === "6") return 6
  return 1
}

/**
 * REQ-PRDT-016: 상품가입 완료(C-06)에서 [자동이체 등록]으로 진입할 때
 * querystring(toAccount/amount/cycleMonths/endDate)으로 넘어온 값을 초기 폼에 반영한다.
 * 고객은 출금계좌와 이체지정일만 추가로 선택하면 되도록 나머지 값을 미리 채운다.
 */
const buildInitialForm = (searchParams: URLSearchParams): AutoTransferForm => {
  const toAccount = searchParams.get("toAccount") ?? ""
  const amountParam = searchParams.get("amount")
  const endDate = searchParams.get("endDate") ?? ""

  if (!toAccount) return INITIAL_FORM

  return {
    ...INITIAL_FORM,
    toAccount,
    toConfirmed: true,
    amount: amountParam ? Number(amountParam) : null,
    cycleMonths: toCycleMonths(searchParams.get("cycleMonths")),
    endDate,
  }
}

/**
 * G-01 ~ G-03 assembly. Holds the shared form state and step index; each step
 * is a pure presentation component that receives values and callbacks. The
 * 거래내용 확인(ConfirmDialog) → 계좌비밀번호 검증 → OTP(OtpModal) 인증 순서를
 * 여기서 조립한다(REQ-AUTO-005, REQ-TRSF-031).
 */
export const AutoTransferScreen = () => {
  const NOW = useBaseTime()
  const TODAY = getToday()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = React.useState(1)
  const [form, setForm] = React.useState<AutoTransferForm>(() =>
    buildInitialForm(searchParams),
  )
  // 확인 다이얼로그를 여는 시점의 시각. 다이얼로그에 표시하는 거래일자·거래시각이
  // 화면 진입 시각으로 고정되지 않게 한다.
  const [transactionAt, setTransactionAt] = React.useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [otpOpen, setOtpOpen] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [accountPasswordAuthToken, setAccountPasswordAuthToken] =
    React.useState<string | null>(null)
  // 첫 실행 예정일은 서버가 산출한다(말일 보정 POL-034 포함). 등록 응답의 값을
  // 그대로 완료 화면에 보여준다 — 화면에서 다시 계산하면 배치 규칙과 어긋난다.
  const [nextExecDate, setNextExecDate] = React.useState<string | null>(null)

  const perTransferLimit = MOCK_TRANSFER_LIMITS.perTransfer

  const {
    accounts: withdrawAccounts,
    options: accountOptions,
    isLoading: accountsLoading,
  } = useWithdrawAccounts()
  const registerMutation = useRegisterAutoTransferMutation()
  const verifyPasswordMutation = useVerifyAccountPasswordMutation()

  const setField = <K extends keyof AutoTransferForm>(
    key: K,
    value: AutoTransferForm[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  // 계좌 목록은 비동기로 도착하므로, 아직 사용자가 고르지 않았다면 첫 계좌를
  // 렌더링 중에 파생값으로 기본 선택한다(useEffect + setState 대신).
  const fromAccount = form.fromAccount || (accountOptions[0]?.accountNo ?? "")
  const displayForm: AutoTransferForm = { ...form, fromAccount }

  const selectedAccount = withdrawAccounts.find(
    (a) => a.accountNumber === fromAccount,
  )

  const startSpan = form.startDate ? daysBetween(TODAY, form.startDate) : null
  const startValid =
    startSpan != null &&
    startSpan >= 1 &&
    startSpan <= AUTO_TRANSFER_START_MAX_RANGE_DAYS
  const endSpan =
    form.startDate && form.endDate
      ? daysBetween(form.startDate, form.endDate)
      : null
  const endValid =
    endSpan != null &&
    endSpan > 0 &&
    form.endDate <= addMonths(form.startDate, 60)
  const canSubmit =
    form.password.length === 4 &&
    form.toConfirmed &&
    form.amount != null &&
    form.amount > 0 &&
    form.amount <= perTransferLimit &&
    startValid &&
    endValid

  const resetAll = () => {
    setForm(INITIAL_FORM)
    setAccountPasswordAuthToken(null)
    setErrorMessage(null)
    setOtpOpen(false)
    verifyPasswordMutation.reset()
    registerMutation.reset()
    setStep(1)
  }

  /**
   * OTP 발급 시점의 거래정보와 등록 요청 본문은 서버가 정규화해 문자열로 대조한다
   * (otp_integration_guide.md, 어긋나면 OTP0102). 두 곳에 같은 값을 손으로 적으면
   * 한쪽만 고쳐도 조용히 어긋나므로 한 객체를 양쪽이 함께 쓴다.
   */
  const otpTransactionData =
    selectedAccount?.accountId == null
      ? null
      : {
          withdrawalAccountId: selectedAccount.accountId,
          depositAccountNumber: form.toAccount,
          amount: form.amount ?? 0,
          cycleMonths: form.cycleMonths,
          transferDay: form.dayOfMonth,
          startDate: form.startDate,
          endDate: form.endDate,
        }

  /**
   * 같은 조건(출금계좌·입금계좌·이체지정일)의 자동이체가 이미 있으면 서버가
   * AUT0301로 거부한다. 화면에서 미리 걸러내지 않고 그 사유를 그대로 띄운다.
   */
  const handleRegisterConfirm = async (otpAuthToken: string) => {
    setOtpOpen(false)

    if (otpTransactionData == null || accountPasswordAuthToken == null) {
      setErrorMessage(
        "인증 정보를 확인할 수 없습니다. 처음부터 다시 시도해 주세요.",
      )
      setAccountPasswordAuthToken(null)
      return
    }

    try {
      const registered = await registerMutation.mutateAsync({
        data: {
          ...otpTransactionData,
          payeeName: MOCK_PAYEE_NAME,
          myPassbookMemo: form.myMemo || undefined,
          recipientPassbookMemo: form.payeeMemo || undefined,
          accountPasswordAuthToken,
          otpAuthToken,
        },
      })

      // 최종 요청에 사용한 인증 토큰은 재사용하지 않는다.
      setAccountPasswordAuthToken(null)
      setNextExecDate(registered?.nextExecutionDate ?? null)
      setErrorMessage(null)
      setStep(3)
    } catch (error) {
      // 서버가 토큰을 소비했을 가능성이 있으므로 실패해도 폐기한다.
      setAccountPasswordAuthToken(null)
      registerMutation.reset()

      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "자동이체 등록에 실패했습니다.",
      )
    }
  }

  const handleAuthenticate = async () => {
    setConfirmOpen(false)
    setAccountPasswordAuthToken(null)

    if (otpTransactionData == null) {
      setErrorMessage(
        "출금계좌 정보를 확인할 수 없습니다. 이전 단계에서 다시 선택해 주세요.",
      )
      return
    }

    try {
      const response = await verifyPasswordMutation.mutateAsync({
        accountId: otpTransactionData.withdrawalAccountId,
        data: {
          accountPassword: form.password,
        },
      })

      // 검증 직후 화면 state와 mutation variables에서 평문 비밀번호를 제거한다.
      setField("password", "")
      verifyPasswordMutation.reset()

      if (!response.accountPasswordAuthToken) {
        setErrorMessage(
          "계좌비밀번호 인증 토큰을 발급받지 못했습니다. 다시 시도해 주세요.",
        )
        return
      }

      setAccountPasswordAuthToken(response.accountPasswordAuthToken)
      setErrorMessage(null)
      setOtpOpen(true)
    } catch (error) {
      // 실패한 경우에도 평문 비밀번호를 남기지 않는다.
      setField("password", "")
      verifyPasswordMutation.reset()
      setAccountPasswordAuthToken(null)

      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "계좌비밀번호 인증에 실패했습니다.",
      )
    }
  }

  const periodLabel = `${formatDate(form.startDate)} ~ ${formatDate(form.endDate)}`

  if (accountsLoading) {
    return (
      <div className="py-20 text-center text-ink-muted">불러오는 중...</div>
    )
  }

  if (step === 2) {
    return (
      <>
        <AutoTransferStep2
          steps={STEPS}
          fromAccount={
            <span>
              {selectedAccount?.accountName} {formatAccountNo(fromAccount)}
            </span>
          }
          toAccount={<span>{formatAccountNo(form.toAccount)}</span>}
          payeeName={maskName(MOCK_PAYEE_NAME)}
          amount={formatAmount(form.amount ?? 0, { suffix: false })}
          cycle={`${form.cycleMonths}개월`}
          dayOfMonth={`매월 ${form.dayOfMonth}일`}
          period={<span>{periodLabel}</span>}
          payeeMemo={form.payeeMemo || "-"}
          onPrev={() => setStep(1)}
          onSubmit={() => {
            setTransactionAt(getNow())
            setConfirmOpen(true)
          }}
        />

        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => void handleAuthenticate()}
          messages={[
            "아래 내용으로 자동이체를 등록합니다.",
            "확인을 누르면 계좌비밀번호 확인 후 OTP 인증으로 이어집니다.",
          ]}
          confirmLabel="확인"
          items={[
            { label: "1. 거래일자", value: formatDate(transactionAt ?? NOW) },
            {
              label: "2. 거래시각",
              value: formatDateTime(transactionAt ?? NOW).slice(11),
            },
            {
              label: "3. 출금계좌번호",
              value: formatAccountNo(fromAccount),
            },
            {
              label: "4. 입금계좌번호",
              value: formatAccountNo(form.toAccount),
            },
            { label: "5. 수취인성명", value: maskName(MOCK_PAYEE_NAME) },
            { label: "6. 이체금액", value: formatAmount(form.amount ?? 0) },
          ]}
        />

        {otpTransactionData != null && (
          <OtpModal
            open={otpOpen}
            onClose={() => {
              setOtpOpen(false)
              setAccountPasswordAuthToken(null)

              // 비밀번호는 이미 검증 직후 제거됐으므로 다시 입력받는다.
              setStep(1)
            }}
            onConfirm={handleRegisterConfirm}
            guide="자동이체 등록을 위해 OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하세요."
            transaction={{
              type: OtpTransactionType.AUTO_TRANSFER,
              data: otpTransactionData,
            }}
          />
        )}

        <ErrorDialog
          open={errorMessage != null}
          onClose={() => {
            setErrorMessage(null)
            setStep(1)
          }}
          title="자동이체 등록 실패"
          messages={errorMessage ? [errorMessage] : []}
        />
      </>
    )
  }

  if (step === 3) {
    return (
      <AutoTransferStep3
        steps={STEPS}
        row={{
          fromAccount: (
            <span>
              {selectedAccount?.accountName} {formatAccountNo(fromAccount)}
            </span>
          ),
          toAccount: formatAccountNo(form.toAccount),
          payeeName: maskName(MOCK_PAYEE_NAME),
          amount: formatAmount(form.amount ?? 0, { suffix: false }),
          period: periodLabel,
          cycle: `${form.cycleMonths}개월`,
          dayOfMonth: `매월 ${form.dayOfMonth}일`,
          nextExecDate: formatDate(nextExecDate ?? ""),
        }}
        highlightAmount={formatAmount(form.amount ?? 0)}
        onViewAutoTransfers={() => {
          resetAll()
          navigate("/transfer/auto")
        }}
      />
    )
  }

  return (
    <AutoTransferStep1
      steps={STEPS}
      accounts={accountOptions}
      form={displayForm}
      onChange={setField}
      today={TODAY}
      perTransferLimit={perTransferLimit}
      payeeName={MOCK_PAYEE_NAME}
      canSubmit={canSubmit}
      onNext={() => setStep(2)}
    />
  )
}
