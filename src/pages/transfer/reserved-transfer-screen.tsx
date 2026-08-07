import * as React from "react"
import { useNavigate } from "react-router"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { OtpModal } from "@/entities/auth"
import {
  MOCK_TRANSFER_ACCOUNTS,
  MOCK_TRANSFER_LIMITS,
  MOCK_PAYEE_NAME,
} from "@/entities/transfer"
import { MOCK_RESERVATIONS } from "@/entities/transfer"
import {
  formatAccountNo,
  formatAmount,
  formatDate,
  formatDateTime,
  maskName,
} from "@/shared/lib/format"
import { daysBetween } from "@/shared/lib/date"
import {
  MOCK_NOW as NOW,
  MOCK_TODAY as TODAY,
} from "@/shared/config/mock-clock"
import { RESERVATION_MAX_RANGE_DAYS } from "@/shared/config/policy"
import { TRANSFER_STEPS as STEPS } from "@/pages/transfer/transfer-steps"
import { ReservedTransferStep1 } from "@/pages/transfer/reserved/e01-input"
import { ReservedTransferStep2 } from "@/pages/transfer/reserved/e02-confirm"
import { ReservedTransferStep3 } from "@/pages/transfer/reserved/e03-complete"

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
  fromAccount: MOCK_TRANSFER_ACCOUNTS[0].accountNo,
  password: "",
  toAccount: "",
  toConfirmed: false,
  amount: null,
  scheduledDate: "",
  payeeMemo: "",
  myMemo: "",
}

const isDuplicate = (form: ReservedTransferForm): boolean => {
  if (!form.toConfirmed || form.amount == null || !form.scheduledDate)
    return false
  return MOCK_RESERVATIONS.some(
    (r) =>
      r.status === "대기" &&
      r.fromAccountNo === form.fromAccount &&
      r.toAccountNo === form.toAccount &&
      r.scheduledDate === form.scheduledDate &&
      r.amount === form.amount,
  )
}

/**
 * E-01 ~ E-03 assembly. Holds the shared form state and step index; each step
 * is a pure presentation component that receives values and callbacks. The
 * 거래내용 확인(ConfirmDialog) → OTP(OtpModal) sequence required before
 * execution (REQ-RSV-005, REQ-TRSF-031) is orchestrated here.
 */
export const ReservedTransferScreen = () => {
  const navigate = useNavigate()
  const [step, setStep] = React.useState(1)
  const [form, setForm] = React.useState<ReservedTransferForm>(INITIAL_FORM)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [otpOpen, setOtpOpen] = React.useState(false)

  const perTransferLimit = MOCK_TRANSFER_LIMITS.perTransfer

  const setField = <K extends keyof ReservedTransferForm>(
    key: K,
    value: ReservedTransferForm[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const selectedAccount = MOCK_TRANSFER_ACCOUNTS.find(
    (a) => a.accountNo === form.fromAccount,
  )

  const dateSpan = form.scheduledDate
    ? daysBetween(TODAY, form.scheduledDate)
    : null
  const dateValid =
    dateSpan != null && dateSpan >= 1 && dateSpan <= RESERVATION_MAX_RANGE_DAYS
  const duplicate = isDuplicate(form)

  const canSubmit =
    form.password.length === 4 &&
    form.toConfirmed &&
    form.amount != null &&
    form.amount > 0 &&
    form.amount <= perTransferLimit &&
    dateValid &&
    !duplicate

  const resetAll = () => {
    setForm(INITIAL_FORM)
    setStep(1)
  }

  if (step === 2) {
    return (
      <>
        <ReservedTransferStep2
          steps={STEPS}
          scheduledDate={<span>{formatDate(form.scheduledDate)}</span>}
          fromAccount={
            <span>
              {selectedAccount?.alias} {formatAccountNo(form.fromAccount)}
            </span>
          }
          toAccount={<span>{formatAccountNo(form.toAccount)}</span>}
          payeeName={maskName(MOCK_PAYEE_NAME)}
          amount={formatAmount(form.amount ?? 0, { suffix: false })}
          fee={formatAmount(0, { suffix: false })}
          payeeMemo={form.payeeMemo || "-"}
          onPrev={() => setStep(1)}
          onSubmit={() => setConfirmOpen(true)}
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
            { label: "1. 거래일자", value: formatDate(NOW) },
            { label: "2. 거래시각", value: formatDateTime(NOW).slice(11) },
            {
              label: "3. 출금계좌번호",
              value: formatAccountNo(form.fromAccount),
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
          onConfirm={() => {
            setOtpOpen(false)
            /** REQ-RSV-007: 등록한 예약이체가 즉시 예약이체 조회/취소(E-04) 목록에 반영된다. */
            MOCK_RESERVATIONS.unshift({
              id: `rsv-${crypto.randomUUID()}`,
              status: "대기",
              scheduledDate: form.scheduledDate,
              registeredAt: NOW,
              fromAccountNo: form.fromAccount,
              fromAlias: selectedAccount?.alias ?? "",
              toAccountNo: form.toAccount,
              payeeName: MOCK_PAYEE_NAME,
              amount: form.amount ?? 0,
              memo: form.payeeMemo || "-",
            })
            setStep(3)
          }}
          guide="예약이체 등록을 위해 OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하세요."
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
              {selectedAccount?.alias} {formatAccountNo(form.fromAccount)}
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
      accounts={MOCK_TRANSFER_ACCOUNTS}
      form={form}
      onChange={setField}
      today={TODAY}
      perTransferLimit={perTransferLimit}
      payeeName={MOCK_PAYEE_NAME}
      duplicate={duplicate}
      canSubmit={canSubmit}
      onNext={() => setStep(2)}
    />
  )
}
