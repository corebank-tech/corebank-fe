import * as React from "react"
import { useNavigate, useSearchParams } from "react-router"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { OtpModal } from "@/entities/auth"
import {
  MOCK_TRANSFER_ACCOUNTS,
  MOCK_TRANSFER_LIMITS,
  MOCK_PAYEE_NAME,
} from "@/entities/transfer"
import { MOCK_AUTO_TRANSFERS } from "@/entities/transfer"
import {
  formatAccountNo,
  formatAmount,
  formatDate,
  formatDateTime,
  maskName,
} from "@/shared/lib/format"
import { addMonths, daysBetween, parseISO, toISO } from "@/shared/lib/date"
import {
  MOCK_NOW as NOW,
  MOCK_TODAY as TODAY,
} from "@/shared/config/mock-clock"
import { AUTO_TRANSFER_START_MAX_RANGE_DAYS } from "@/shared/config/policy"
import type { TransferCycleMonths } from "@/widgets/transfer"
import { TRANSFER_STEPS as STEPS } from "@/pages/transfer/transfer-steps"
import { AutoTransferStep1 } from "@/pages/transfer/auto/g01-input"
import { AutoTransferStep2 } from "@/pages/transfer/auto/g02-confirm"
import { AutoTransferStep3 } from "@/pages/transfer/auto/g03-complete"

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
  fromAccount: MOCK_TRANSFER_ACCOUNTS[0].accountNo,
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

const isDuplicate = (form: AutoTransferForm): boolean => {
  if (!form.toConfirmed) return false
  return MOCK_AUTO_TRANSFERS.some(
    (a) =>
      a.status === "정상" &&
      a.fromAccountNo === form.fromAccount &&
      a.toAccountNo === form.toAccount &&
      a.dayOfMonth === form.dayOfMonth,
  )
}

/** 대상 월에 지정일이 없으면(29·30·31일) 말일로 보정한다 (POL-034). */
const clampToMonth = (year: number, monthIndex: number, day: number): Date => {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  return new Date(year, monthIndex, Math.min(day, lastDay))
}

/** 시작일 이후 첫 이체지정일(말일 보정 포함)을 첫 실행 예정일로 산출한다. */
const computeFirstExecDate = (startISO: string, dayOfMonth: number): string => {
  const start = parseISO(startISO)
  let candidate = clampToMonth(
    start.getFullYear(),
    start.getMonth(),
    dayOfMonth,
  )
  if (candidate < start) {
    const nextMonthIndex = start.getMonth() + 1
    const year = start.getFullYear() + Math.floor(nextMonthIndex / 12)
    const month = nextMonthIndex % 12
    candidate = clampToMonth(year, month, dayOfMonth)
  }
  return toISO(candidate)
}

/**
 * G-01 ~ G-03 assembly. Holds the shared form state and step index; each step
 * is a pure presentation component that receives values and callbacks. The
 * 거래내용 확인(ConfirmDialog) → OTP(OtpModal) sequence required before
 * execution (REQ-AUTO-005, REQ-TRSF-031) is orchestrated here.
 */
export const AutoTransferScreen = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = React.useState(1)
  const [form, setForm] = React.useState<AutoTransferForm>(() =>
    buildInitialForm(searchParams),
  )
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [otpOpen, setOtpOpen] = React.useState(false)

  const perTransferLimit = MOCK_TRANSFER_LIMITS.perTransfer

  const setField = <K extends keyof AutoTransferForm>(
    key: K,
    value: AutoTransferForm[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const selectedAccount = MOCK_TRANSFER_ACCOUNTS.find(
    (a) => a.accountNo === form.fromAccount,
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
  const duplicate = isDuplicate(form)

  const canSubmit =
    form.password.length === 4 &&
    form.toConfirmed &&
    form.amount != null &&
    form.amount > 0 &&
    form.amount <= perTransferLimit &&
    startValid &&
    endValid &&
    !duplicate

  const resetAll = () => {
    setForm(INITIAL_FORM)
    setStep(1)
  }

  const periodLabel = `${formatDate(form.startDate)} ~ ${formatDate(form.endDate)}`
  const nextExecDate = form.startDate
    ? computeFirstExecDate(form.startDate, form.dayOfMonth)
    : ""

  if (step === 2) {
    return (
      <>
        <AutoTransferStep2
          steps={STEPS}
          fromAccount={
            <span className="tabular-nums">
              {selectedAccount?.alias} {formatAccountNo(form.fromAccount)}
            </span>
          }
          toAccount={
            <span className="tabular-nums">
              {formatAccountNo(form.toAccount)}
            </span>
          }
          payeeName={maskName(MOCK_PAYEE_NAME)}
          amount={formatAmount(form.amount ?? 0, { suffix: false })}
          cycle={`${form.cycleMonths}개월`}
          dayOfMonth={`매월 ${form.dayOfMonth}일`}
          period={<span className="tabular-nums">{periodLabel}</span>}
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
            "아래 내용으로 자동이체를 등록합니다.",
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
            /** REQ-AUTO-009: 등록한 자동이체가 즉시 자동이체 조회/변경/해지(G-04) 목록에 반영된다. */
            MOCK_AUTO_TRANSFERS.unshift({
              id: `at-${crypto.randomUUID()}`,
              fromAccountNo: form.fromAccount,
              fromAlias: selectedAccount?.alias ?? "",
              toAccountNo: form.toAccount,
              payeeName: MOCK_PAYEE_NAME,
              amount: form.amount ?? 0,
              cycleMonths: form.cycleMonths,
              dayOfMonth: form.dayOfMonth,
              startDate: form.startDate,
              endDate: form.endDate,
              memo: form.payeeMemo || "-",
              status: "정상",
              nextExecDate,
            })
            setStep(3)
          }}
          guide="자동이체 등록을 위해 OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하세요."
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
            <span className="tabular-nums">
              {selectedAccount?.alias} {formatAccountNo(form.fromAccount)}
            </span>
          ),
          toAccount: formatAccountNo(form.toAccount),
          payeeName: maskName(MOCK_PAYEE_NAME),
          amount: formatAmount(form.amount ?? 0, { suffix: false }),
          period: periodLabel,
          cycle: `${form.cycleMonths}개월`,
          dayOfMonth: `매월 ${form.dayOfMonth}일`,
          nextExecDate: formatDate(nextExecDate),
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
