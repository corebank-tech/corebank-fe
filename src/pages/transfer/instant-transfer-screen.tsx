import * as React from "react"
import { useNavigate, useSearchParams } from "react-router"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { OtpModal } from "@/entities/auth"
import { ResultPanel, type ResultVariant } from "@/widgets/transfer"
import type { DataGridColumn } from "@/shared/ui/data-grid"
import {
  MOCK_ACCOUNT_PASSWORDS,
  MOCK_FREQUENT_ACCOUNTS_MAX,
  MOCK_FREQUENT_TRANSFER_ACCOUNTS,
  MOCK_RECENT_TRANSFER_ACCOUNTS,
  MOCK_TRANSFER_ACCOUNTS,
  MOCK_TRANSFER_HISTORY,
  MOCK_TRANSFER_LIMITS,
  generateTransactionId,
  lookupPayeeAccount,
  type FrequentTransferAccount,
  type TransferResultRow,
} from "@/entities/transfer"
import {
  MOCK_OVERVIEW_ACCOUNTS,
  MOCK_ORDER_ACCOUNTS,
  MOCK_PASSWORD_ACCOUNTS,
  MOCK_WITHDRAWAL_ACCOUNTS,
} from "@/entities/account"
import {
  MOCK_ACCESS_STATUS,
  MOCK_DASHBOARD_ACCOUNTS,
} from "@/entities/dashboard"
import {
  formatAccountNo,
  formatAmount,
  formatDate,
  formatDateTime,
  maskName,
} from "@/shared/lib/format"
import { getNow } from "@/shared/config/clock"
import { useBaseTime } from "@/shared/lib/hooks/use-base-time"
import { TRANSFER_STEPS as STEPS } from "@/pages/transfer/transfer-steps"
import { InstantTransferStep1 } from "@/pages/transfer/instant-transfer/d01-input"
import { InstantTransferStep2 } from "@/pages/transfer/instant-transfer/d02-confirm"
import { InstantTransferStep3 } from "@/pages/transfer/instant-transfer/d03-result"

export type InstantTransferForm = {
  fromAccount: string
  password: string
  toAccount: string
  toConfirmed: boolean
  /** REQ-TRSF-004: 계좌확인으로 조회된 예금주명. */
  payeeName: string
  /** REQ-TRSF-004·007·030: 계좌확인 실패 사유. */
  toAccountError: string | null
  /** 조회는 통과했지만 실행 단계에서 실패하는 데모 계좌 여부. */
  executionFails: boolean
  amount: number | null
  payeeMemo: string
  myMemo: string
}

type InstantTransferResultState = {
  variant: ResultVariant
  row: TransferResultRow
  errorCode?: string
  failReason?: string
}

type DebitableAccount = {
  accountNo: string
  balance: number
  withdrawable?: number
}

/**
 * 이체 실행 후 계좌를 표시하는 모든 화면(B-01·B-04·B-05·B-07·대시보드)의
 * 잔액을 함께 갱신한다. 각 화면이 자체 mock 배열을 보유하고 있어 화면별로
 * 반복 적용한다.
 */
const debitAccount = (
  rows: DebitableAccount[],
  accountNo: string,
  amount: number,
) => {
  const row = rows.find((r) => r.accountNo === accountNo)
  if (!row) return
  row.balance -= amount
  if (row.withdrawable != null) row.withdrawable -= amount
}

const INITIAL_FORM: InstantTransferForm = {
  fromAccount: MOCK_TRANSFER_ACCOUNTS[0].accountNo,
  password: "",
  toAccount: "",
  toConfirmed: false,
  payeeName: "",
  toAccountError: null,
  executionFails: false,
  amount: null,
  payeeMemo: "",
  myMemo: "",
}

/**
 * D-01 ~ D-03 assembly. Holds the shared form state and step index; each step
 * is a pure presentation component that receives values and callbacks. The
 * 거래내용 확인(ConfirmDialog) → 계좌비밀번호 검증 → OTP(OtpModal) 인증 순서
 * (REQ-TRSF-009, REQ-TRSF-031)는 여기서 조립한다.
 */
export const InstantTransferScreen = () => {
  const BASE_TIME = useBaseTime()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = React.useState(1)
  const [form, setForm] = React.useState<InstantTransferForm>(() => {
    /** REQ-INQR-005: 계좌목록의 [이체] 진입 시 출금계좌가 선택된 상태로 시작한다. */
    const fromParam = searchParams.get("from")
    const preselected = MOCK_TRANSFER_ACCOUNTS.find(
      (a) => a.accountNo === fromParam,
    )
    return preselected
      ? { ...INITIAL_FORM, fromAccount: preselected.accountNo }
      : INITIAL_FORM
  })
  // 확인 다이얼로그를 여는 시점의 시각. 화면 표시(이체예정일시·다이얼로그)와
  // 원장 기록이 모두 이 값을 써서, 사용자가 확인한 거래시각과 저장되는 거래시각이
  // 어긋나지 않게 한다.
  const [transactionAt, setTransactionAt] = React.useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [otpOpen, setOtpOpen] = React.useState(false)
  const [authError, setAuthError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<InstantTransferResultState | null>(
    null,
  )
  const [frequentAccounts, setFrequentAccounts] = React.useState<
    FrequentTransferAccount[]
  >(MOCK_FREQUENT_TRANSFER_ACCOUNTS)

  const dailyRemaining =
    MOCK_TRANSFER_LIMITS.perDay - MOCK_TRANSFER_LIMITS.usedToday
  const perTransferLimit = MOCK_TRANSFER_LIMITS.perTransfer
  const effectiveLimit = Math.min(perTransferLimit, dailyRemaining)

  const setField = <K extends keyof InstantTransferForm>(
    key: K,
    value: InstantTransferForm[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const selectedAccount = MOCK_TRANSFER_ACCOUNTS.find(
    (a) => a.accountNo === form.fromAccount,
  )

  /** REQ-TRSF-004·007·030: 입금계좌번호를 조회해 예금주·계좌유형·동일계좌 여부를 검증한다. */
  const resolveToAccount = (accountNo: string) => {
    if (accountNo.length !== 12) {
      setForm((f) => ({
        ...f,
        toAccount: accountNo,
        toConfirmed: false,
        payeeName: "",
        executionFails: false,
        toAccountError: "입금계좌번호 12자리를 정확히 입력하세요.",
      }))
      return
    }
    if (accountNo === form.fromAccount) {
      setForm((f) => ({
        ...f,
        toAccount: accountNo,
        toConfirmed: false,
        payeeName: "",
        executionFails: false,
        toAccountError:
          "출금계좌와 입금계좌가 동일합니다. 다른 계좌를 입력하세요.",
      }))
      return
    }
    const looked = lookupPayeeAccount(accountNo)
    if (!looked.ok) {
      setForm((f) => ({
        ...f,
        toAccount: accountNo,
        toConfirmed: false,
        payeeName: "",
        executionFails: false,
        toAccountError: looked.error ?? null,
      }))
      return
    }
    setForm((f) => ({
      ...f,
      toAccount: accountNo,
      toConfirmed: true,
      payeeName: looked.payeeName ?? "",
      executionFails: looked.executionFails ?? false,
      toAccountError: null,
    }))
  }

  const canSubmit =
    form.password.length === 4 &&
    form.toConfirmed &&
    form.amount != null &&
    form.amount > 0 &&
    form.amount <= effectiveLimit

  if (step === 2) {
    const amount = form.amount ?? 0
    const balanceInsufficient =
      selectedAccount != null && amount > selectedAccount.withdrawable
    const balanceAfter = Math.max(
      (selectedAccount?.withdrawable ?? 0) - amount,
      0,
    )

    const handleTransferClick = () => {
      if (balanceInsufficient) {
        setAuthError(
          `출금가능금액 ${formatAmount(selectedAccount?.withdrawable ?? 0)}이 이체금액보다 적어 이체를 실행할 수 없습니다. 이체금액을 낮춰 다시 시도하세요.`,
        )
        return
      }
      setAuthError(null)
      setTransactionAt(getNow())
      setConfirmOpen(true)
    }

    const handleConfirmDialogConfirm = () => {
      setConfirmOpen(false)
      if (form.password !== MOCK_ACCOUNT_PASSWORDS[form.fromAccount]) {
        setAuthError(
          "계좌비밀번호가 일치하지 않습니다. 이전 단계에서 계좌비밀번호를 다시 확인하세요.",
        )
        return
      }
      setAuthError(null)
      setOtpOpen(true)
    }

    const handleOtpConfirm = () => {
      const executedAt = transactionAt ?? getNow()
      setOtpOpen(false)
      if (form.executionFails) {
        setResult({
          variant: "fail",
          row: {
            transactionId: "-",
            processedAt: executedAt,
            fromAccountNo: form.fromAccount,
            toAccountNo: form.toAccount,
            payeeName: form.payeeName,
            amount,
            fee: 0,
            memo: form.payeeMemo || "-",
            balanceAfter: selectedAccount?.withdrawable ?? 0,
          },
          errorCode: "ERR-9001",
          failReason:
            "일시적인 시스템 오류로 이체가 처리되지 않았습니다. 잠시 후 다시 시도하세요.",
        })
      } else {
        const transactionId = generateTransactionId(executedAt)
        setResult({
          variant: "success",
          row: {
            transactionId,
            processedAt: executedAt,
            fromAccountNo: form.fromAccount,
            toAccountNo: form.toAccount,
            payeeName: form.payeeName,
            amount,
            fee: 0,
            memo: form.payeeMemo || "-",
            balanceAfter,
          },
        })

        /**
         * 이체 실행 결과를 원장에 반영한다 — REQ-TRSF-021·022·023(이체결과조회),
         * REQ-TRSF-024(당일 사용금액 즉시 갱신), 계좌 잔액·최근거래일 갱신.
         */
        MOCK_TRANSFER_HISTORY.unshift({
          id: transactionId,
          datetime: executedAt,
          fromAccountNo: form.fromAccount,
          fromAlias: selectedAccount?.alias ?? "",
          toAccountNo: form.toAccount,
          payeeName: form.payeeName,
          amount,
          fee: 0,
          status: "정상",
          txId: transactionId,
          memo: form.payeeMemo || "-",
        })
        MOCK_TRANSFER_LIMITS.usedToday += amount
        MOCK_ACCESS_STATUS.lastTransaction = executedAt
        for (const rows of [
          MOCK_TRANSFER_ACCOUNTS,
          MOCK_OVERVIEW_ACCOUNTS,
          MOCK_PASSWORD_ACCOUNTS,
          MOCK_WITHDRAWAL_ACCOUNTS,
          MOCK_ORDER_ACCOUNTS,
          MOCK_DASHBOARD_ACCOUNTS,
        ]) {
          debitAccount(rows, form.fromAccount, amount)
        }
        const transferDate = executedAt.slice(0, 10)
        const overviewRow = MOCK_OVERVIEW_ACCOUNTS.find(
          (a) => a.accountNo === form.fromAccount,
        )
        if (overviewRow) overviewRow.lastActivityDate = transferDate
        const dashboardRow = MOCK_DASHBOARD_ACCOUNTS.find(
          (a) => a.accountNo === form.fromAccount,
        )
        if (dashboardRow) dashboardRow.lastTxDate = transferDate
      }
      setStep(3)
    }

    return (
      <>
        <InstantTransferStep2
          steps={STEPS}
          scheduledAt={
            <span>{formatDateTime(transactionAt ?? BASE_TIME)}</span>
          }
          fromAccount={
            <span>
              {selectedAccount?.alias} {formatAccountNo(form.fromAccount)}
            </span>
          }
          toAccount={<span>{formatAccountNo(form.toAccount)}</span>}
          payeeName={maskName(form.payeeName)}
          amount={formatAmount(amount, { suffix: false })}
          fee={formatAmount(0, { suffix: false })}
          balanceAfter={formatAmount(balanceAfter, { suffix: false })}
          payeeMemo={form.payeeMemo || "-"}
          myMemo={form.myMemo || "-"}
          authError={authError}
          onPrev={() => setStep(1)}
          onSubmit={handleTransferClick}
        />

        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleConfirmDialogConfirm}
          messages={[
            "아래 내용으로 즉시이체를 실행합니다.",
            "확인을 누르면 계좌비밀번호 검증과 OTP 인증으로 이어집니다.",
          ]}
          confirmLabel="확인"
          items={[
            {
              label: "1. 거래일자",
              value: formatDate(transactionAt ?? BASE_TIME),
            },
            {
              label: "2. 거래시각",
              value: formatDateTime(transactionAt ?? BASE_TIME).slice(11),
            },
            {
              label: "3. 출금계좌번호",
              value: formatAccountNo(form.fromAccount),
            },
            {
              label: "4. 입금계좌번호",
              value: formatAccountNo(form.toAccount),
            },
            { label: "5. 수취인성명", value: maskName(form.payeeName) },
            { label: "6. 이체금액", value: formatAmount(amount) },
          ]}
        />

        <OtpModal
          open={otpOpen}
          onClose={() => setOtpOpen(false)}
          onConfirm={handleOtpConfirm}
          title="즉시이체 OTP 인증"
          guide="즉시이체 실행을 위해 OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하세요."
        />
      </>
    )
  }

  if (step === 3 && result) {
    const isSuccess = result.variant === "success"
    const row = result.row

    const columns: DataGridColumn<TransferResultRow>[] = [
      {
        key: "result",
        header: "결과",
        align: "center",
        width: 70,
        render: () => (
          <Badge variant={isSuccess ? "success" : "danger"}>
            {isSuccess ? "정상" : "오류"}
          </Badge>
        ),
      },
      {
        key: "transactionId",
        header: "거래번호",
        align: "center",
        width: 190,
        render: (r) => <span>{r.transactionId}</span>,
      },
      {
        key: "processedAt",
        header: "거래일시",
        align: "center",
        width: 150,
        render: (r) => <span>{formatDateTime(r.processedAt)}</span>,
      },
      {
        key: "fromAccountNo",
        header: "출금계좌",
        align: "center",
        render: (r) => <span>{formatAccountNo(r.fromAccountNo)}</span>,
      },
      {
        key: "toAccountNo",
        header: "입금계좌",
        align: "center",
        render: (r) => <span>{formatAccountNo(r.toAccountNo)}</span>,
      },
      {
        key: "payeeName",
        header: "받는분",
        align: "center",
        width: 90,
        render: (r) => maskName(r.payeeName),
      },
      {
        key: "amount",
        header: "이체금액(원)",
        align: "right",
        width: 130,
        render: (r) => formatAmount(r.amount, { suffix: false }),
      },
      {
        key: "fee",
        header: "수수료(원)",
        align: "right",
        width: 100,
        render: (r) => formatAmount(r.fee, { suffix: false }),
      },
      {
        key: "balanceAfter",
        header: "이체후잔액(원)",
        align: "right",
        width: 140,
        render: (r) => formatAmount(r.balanceAfter, { suffix: false }),
      },
    ]

    const alreadyFrequent = frequentAccounts.some(
      (a) => a.accountNo === row.toAccountNo,
    )
    const frequentFull = frequentAccounts.length >= MOCK_FREQUENT_ACCOUNTS_MAX

    const handleRegisterFrequent = () => {
      if (alreadyFrequent || frequentFull) return
      setFrequentAccounts((prev) => [
        ...prev,
        { accountNo: row.toAccountNo, payeeName: row.payeeName },
      ])
    }

    return (
      <InstantTransferStep3
        steps={STEPS}
        onNewTransfer={() => {
          setForm(INITIAL_FORM)
          setResult(null)
          setAuthError(null)
          setStep(1)
        }}
        resultSlot={
          <ResultPanel
            variant={result.variant}
            message={
              isSuccess
                ? "이체가 완료되었습니다."
                : "이체가 처리되지 않았습니다."
            }
            description={
              isSuccess
                ? "이체결과조회에서 처리 내역을 확인할 수 있습니다."
                : `${result.failReason} (오류코드 ${result.errorCode})`
            }
            highlightValue={formatAmount(row.amount)}
            footnote={
              isSuccess
                ? "※ 이체 후 출금계좌 잔액은 이체결과조회에서 다시 확인할 수 있습니다."
                : "※ 실패한 이체는 원장에 반영되지 않으며, 잔액과 거래내역이 변동하지 않습니다. 이체 이력에는 오류 상태로 기록됩니다."
            }
            columns={columns}
            row={row}
            actions={
              <>
                <Button
                  variant="outline"
                  size="lg"
                  className="min-w-35"
                  onClick={() => navigate("/transfer/history")}
                >
                  이체결과조회
                </Button>
                {isSuccess && (
                  <Button
                    variant={
                      alreadyFrequent || frequentFull ? "secondary" : "primary"
                    }
                    size="lg"
                    className="min-w-40"
                    disabled={alreadyFrequent || frequentFull}
                    onClick={handleRegisterFrequent}
                  >
                    {alreadyFrequent
                      ? "자주 쓰는 계좌 등록됨"
                      : frequentFull
                        ? `자주 쓰는 계좌 ${MOCK_FREQUENT_ACCOUNTS_MAX}건 초과`
                        : "자주 쓰는 계좌로 등록"}
                  </Button>
                )}
              </>
            }
          />
        }
      />
    )
  }

  return (
    <InstantTransferStep1
      steps={STEPS}
      accounts={MOCK_TRANSFER_ACCOUNTS}
      form={form}
      onChange={setField}
      perTransferLimit={perTransferLimit}
      dailyRemaining={dailyRemaining}
      canSubmit={canSubmit}
      onNext={() => setStep(2)}
      onConfirmAccount={() => resolveToAccount(form.toAccount)}
      onSelectQuickAccount={resolveToAccount}
      frequentAccounts={frequentAccounts}
      recentAccounts={MOCK_RECENT_TRANSFER_ACCOUNTS}
    />
  )
}
