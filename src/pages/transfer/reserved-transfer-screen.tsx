import * as React from "react"
import { useNavigate } from "react-router"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { ErrorDialog } from "@/shared/ui/error-dialog"
import { OtpModal } from "@/entities/auth"
// TODO: 실시간 예금주 조회(GET /transfers/payee, 즉시이체 영역)가 연동되면
// 입금계좌번호 확인 시 실제 예금주명을 조회해서 MOCK_PAYEE_NAME 대신 써야 한다.
// 지금은 입력한 계좌번호와 무관하게 항상 이 값이 표시된다.
import { MOCK_TRANSFER_LIMITS, MOCK_PAYEE_NAME } from "@/entities/transfer"
import {
  formatAccountNo,
  formatAmount,
  formatDate,
  formatDateTime,
  maskName,
} from "@/shared/lib/format"
import { daysBetween } from "@/shared/lib/date"
import { getToday } from "@/shared/config/clock"
import { getNow } from "@/shared/config/clock"
import { useBaseTime } from "@/shared/lib/hooks/use-base-time"
import { RESERVATION_MAX_RANGE_DAYS } from "@/shared/config/policy"
import { TRANSFER_STEPS as STEPS } from "@/pages/transfer/transfer-steps"
import { ReservedTransferStep1 } from "@/pages/transfer/reserved/e01-input"
import { ReservedTransferStep2 } from "@/pages/transfer/reserved/e02-confirm"
import { ReservedTransferStep3 } from "@/pages/transfer/reserved/e03-complete"
import { useGetAccounts } from "@/shared/api/generated/account-controller/account-controller"
import { useRegisterScheduledTransfer } from "@/shared/api/generated/scheduled-transfer-controller/scheduled-transfer-controller"
import type { AccountOverviewResponse } from "@/shared/api/generated/model"
import { ApiError } from "@/shared/api/api-error"
import type { AccountOption } from "@/shared/types/account"

export type ReservedTransferForm = {
  fromAccount: string
  password: string
  toAccount: string
  toConfirmed: boolean
  amount: number | null
  scheduledDate: string
  payeeMemo: string
  myMemo: string
}

const INITIAL_FORM: ReservedTransferForm = {
  fromAccount: "",
  password: "",
  toAccount: "",
  toConfirmed: false,
  amount: null,
  scheduledDate: "",
  payeeMemo: "",
  myMemo: "",
}

// TODO: 계좌비밀번호(POST /accounts/{id}/password/verify)·OTP(POST /otp/issue, /otp/verify)
// 실제 발급 API가 연동되면 그 결과 토큰으로 교체한다. scheduledtransfer 도메인의 토큰
// 검증이 아직 mock(빈 값만 아니면 통과)이라 지금은 임시 문자열을 쓴다.
const TEMP_AUTH_TOKEN = "temp-auth-token"

/**
 * E-01 ~ E-03 assembly. Holds the shared form state and step index; each step
 * is a pure presentation component that receives values and callbacks. The
 * 거래내용 확인(ConfirmDialog) → OTP(OtpModal) sequence required before
 * execution (REQ-RSV-005, REQ-TRSF-031) is orchestrated here.
 */
export const ReservedTransferScreen = () => {
  const NOW = useBaseTime()
  const TODAY = getToday()
  const navigate = useNavigate()
  const [step, setStep] = React.useState(1)
  const [form, setForm] = React.useState<ReservedTransferForm>(INITIAL_FORM)
  // 확인 다이얼로그를 여는 시점의 시각. 다이얼로그에 표시하는 거래일자·거래시각이
  // 화면 진입 시각으로 고정되지 않게 한다.
  const [transactionAt, setTransactionAt] = React.useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [otpOpen, setOtpOpen] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const perTransferLimit = MOCK_TRANSFER_LIMITS.perTransfer

  const { data: accountsData, isLoading: accountsLoading } = useGetAccounts()
  const registerMutation = useRegisterScheduledTransfer()

  // orval이 생성한 타입은 스펙에 적힌 공통 응답 봉투(ApiResponse<T>) 그대로다.
  // customFetch가 런타임에는 이미 봉투를 벗겨 data만 돌려주므로, 실제 형태로 다시 맞춰준다.
  const overview = accountsData as unknown as
    AccountOverviewResponse | undefined
  const withdrawAccounts = React.useMemo(() => {
    const items = (overview?.items ?? []).flatMap((g) => g.accounts ?? [])
    // 출금계좌로 쓸 수 있는 건 입출금계좌 중 이체 가능한 활성 계좌뿐이다.
    return items.filter(
      (a) =>
        a.accountType === "DEMAND_DEPOSIT" &&
        a.status === "ACTIVE" &&
        a.transferEnabled,
    )
  }, [overview])

  const accountOptions: AccountOption[] = withdrawAccounts.map((a) => ({
    alias: a.accountName ?? "",
    accountNo: a.accountNumber ?? "",
    balance: a.balance ?? 0,
    withdrawable: a.balance ?? 0,
  }))

  // 계좌 목록은 비동기로 도착하므로, 아직 사용자가 고르지 않았다면 첫 계좌를
  // 렌더링 중에 파생값으로 기본 선택한다(useEffect + setState 대신).
  const fromAccount = form.fromAccount || (accountOptions[0]?.accountNo ?? "")
  const displayForm: ReservedTransferForm = { ...form, fromAccount }

  const setField = <K extends keyof ReservedTransferForm>(
    key: K,
    value: ReservedTransferForm[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const selectedAccount = withdrawAccounts.find(
    (a) => a.accountNumber === fromAccount,
  )

  const dateSpan = form.scheduledDate
    ? daysBetween(TODAY, form.scheduledDate)
    : null
  const dateValid =
    dateSpan != null && dateSpan >= 1 && dateSpan <= RESERVATION_MAX_RANGE_DAYS

  const canSubmit =
    form.password.length === 4 &&
    form.toConfirmed &&
    form.amount != null &&
    form.amount > 0 &&
    form.amount <= perTransferLimit &&
    dateValid

  const resetAll = () => {
    setForm(INITIAL_FORM)
    setStep(1)
  }

  const handleRegisterConfirm = async () => {
    setOtpOpen(false)
    if (!selectedAccount) return
    try {
      await registerMutation.mutateAsync({
        data: {
          withdrawalAccountId: selectedAccount.accountId,
          depositAccountNumber: form.toAccount,
          payeeName: MOCK_PAYEE_NAME,
          amount: form.amount ?? 0,
          scheduledDate: form.scheduledDate,
          myPassbookMemo: form.myMemo || undefined,
          recipientPassbookMemo: form.payeeMemo || undefined,
          accountPasswordAuthToken: TEMP_AUTH_TOKEN,
          otpAuthToken: TEMP_AUTH_TOKEN,
        },
      })
      setStep(3)
    } catch (e) {
      setErrorMessage(
        e instanceof ApiError ? e.message : "예약이체 등록에 실패했습니다.",
      )
    }
  }

  if (accountsLoading) {
    return (
      <div className="py-20 text-center text-ink-muted">불러오는 중...</div>
    )
  }

  if (step === 2) {
    return (
      <>
        <ReservedTransferStep2
          steps={STEPS}
          scheduledDate={<span>{formatDate(form.scheduledDate)}</span>}
          fromAccount={
            <span>
              {selectedAccount?.accountName} {formatAccountNo(fromAccount)}
            </span>
          }
          toAccount={<span>{formatAccountNo(form.toAccount)}</span>}
          payeeName={maskName(MOCK_PAYEE_NAME)}
          amount={formatAmount(form.amount ?? 0, { suffix: false })}
          fee={formatAmount(0, { suffix: false })}
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
          onConfirm={() => {
            setConfirmOpen(false)
            setOtpOpen(true)
          }}
          messages={[
            "아래 내용으로 예약이체를 등록합니다.",
            "확인을 누르면 OTP 인증으로 이어집니다.",
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

        <OtpModal
          open={otpOpen}
          onClose={() => setOtpOpen(false)}
          onConfirm={handleRegisterConfirm}
          guide="예약이체 등록을 위해 OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하세요."
        />

        <ErrorDialog
          open={errorMessage != null}
          onClose={() => setErrorMessage(null)}
          title="예약이체 등록 실패"
          messages={errorMessage ? [errorMessage] : []}
        />
      </>
    )
  }

  if (step === 3) {
    return (
      <ReservedTransferStep3
        steps={STEPS}
        row={{
          scheduledDate: formatDate(form.scheduledDate),
          fromAccount: (
            <span>
              {selectedAccount?.accountName} {formatAccountNo(fromAccount)}
            </span>
          ),
          toAccount: formatAccountNo(form.toAccount),
          payeeName: maskName(MOCK_PAYEE_NAME),
          amount: formatAmount(form.amount ?? 0, { suffix: false }),
          fee: formatAmount(0, { suffix: false }),
          payeeMemo: form.payeeMemo || "-",
          myMemo: form.myMemo || "-",
        }}
        highlightAmount={formatAmount(form.amount ?? 0)}
        onViewReservations={() => {
          resetAll()
          navigate("/transfer/reservation")
        }}
      />
    )
  }

  return (
    <ReservedTransferStep1
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
