import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate, useSearchParams } from "react-router"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { OtpModal, OtpTransactionType } from "@/entities/auth"
import { ResultPanel, type ResultVariant } from "@/widgets/transfer"
import type { DataGridColumn } from "@/shared/ui/data-grid"
import {
  MOCK_RECENT_TRANSFER_ACCOUNTS,
  fetchPayee,
  getFavoriteAccountsQueryKey,
  useExecuteTransferMutation,
  useFavoriteAccountsQuery,
  useRegisterFavoriteAccountMutation,
  useTransferLimitQuery,
  isSameTransferIntent,
  toOtpTransactionData,
  toTransferRequest,
  getTransferLimitQueryKey,
  type TransferIntent,
  type TransferResultRow,
} from "@/entities/transfer"
import {
  getAccountOverviewQueryKey,
  useWithdrawAccounts,
  useVerifyAccountPasswordMutation,
} from "@/entities/account"
import { getLoginStatusQueryKey } from "@/entities/dashboard"
import { ApiError, toErrorMessage } from "@/shared/api/api-error"
import { TransferResponseStatus } from "@/entities/transfer"
import { FREQUENT_TRANSFER_ACCOUNT_MAX } from "@/shared/config/policy"
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

const INITIAL_FORM: InstantTransferForm = {
  fromAccount: "",
  password: "",
  toAccount: "",
  toConfirmed: false,
  payeeName: "",
  toAccountError: null,
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
  const queryClient = useQueryClient()
  const BASE_TIME = useBaseTime()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = React.useState(1)
  const [form, setForm] = React.useState<InstantTransferForm>(INITIAL_FORM)

  const {
    accounts: withdrawAccounts,
    options: accounts,
    isLoading: isAccountsLoading,
  } = useWithdrawAccounts()
  const {
    data: limit,
    isLoading: isLimitLoading,
    isError: isLimitError,
    error: limitError,
  } = useTransferLimitQuery()
  const favoriteAccountsQuery = useFavoriteAccountsQuery()
  const registerFavoriteMutation = useRegisterFavoriteAccountMutation()
  const verifyPasswordMutation = useVerifyAccountPasswordMutation()
  const executeMutation = useExecuteTransferMutation()

  /** REQ-INQR-005: 계좌목록의 [이체] 진입 시 출금계좌가 선택된 상태로 시작한다. */
  const fromParam = searchParams.get("from")
  const effectiveFromAccount =
    form.fromAccount ||
    (accounts.some((a) => a.accountNo === fromParam)
      ? (fromParam ?? "")
      : (accounts[0]?.accountNo ?? ""))

  // 셀렉트를 건드리지 않으면 form.fromAccount 가 빈 문자열이다. 화면·확인모달·실행이
  // 전부 이 파생값만 보게 해서 소비처가 늘어도 원본이 새지 않게 한다.
  const displayForm = { ...form, fromAccount: effectiveFromAccount }

  const frequentAccounts = favoriteAccountsQuery.accounts
  // 확인 다이얼로그를 여는 시점의 시각. 화면 표시(이체예정일시·다이얼로그)와
  // 원장 기록이 모두 이 값을 써서, 사용자가 확인한 거래시각과 저장되는 거래시각이
  // 어긋나지 않게 한다.
  const [transactionAt, setTransactionAt] = React.useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [otpOpen, setOtpOpen] = React.useState(false)
  const [authError, setAuthError] = React.useState<string | null>(null)
  const [favoriteError, setFavoriteError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<InstantTransferResultState | null>(
    null,
  )
  const [passwordAuthToken, setPasswordAuthToken] = React.useState<
    string | null
  >(null)
  const [idempotencyKey, setIdempotencyKey] = React.useState("")
  const [keyedIntent, setKeyedIntent] = React.useState<TransferIntent | null>(
    null,
  )

  // "아직 모른다" 와 "한도가 0원이다" 를 같은 값으로 만들면 조회 실패가 그대로 굳어
  // [다음]이 영영 안 눌리고 "금액을 낮추라"는 틀린 안내만 남는다.
  const isLimitUnavailable = isLimitLoading || isLimitError || limit == null
  /**
   * 한도를 모르는 동안 [다음]이 막히므로(REQ-TRSF-010) 그 이유를 1단계에 적는다.
   * 조회 실패 문구는 서버가 준 것을 그대로 쓴다(REQ-CMN-008).
   */
  const limitNotice = isLimitLoading
    ? "이체한도를 불러오는 중입니다."
    : isLimitUnavailable
      ? toErrorMessage(limitError)
      : null
  const dailyRemaining = limit?.dailyRemainingAmount ?? 0
  const perTransferLimit = limit?.oneTimeLimit ?? 0
  const effectiveLimit = Math.min(perTransferLimit, dailyRemaining)

  const setField = <K extends keyof InstantTransferForm>(
    key: K,
    value: InstantTransferForm[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const selectedAccount = accounts.find(
    (a) => a.accountNo === displayForm.fromAccount,
  )
  const selectedAccountId = withdrawAccounts.find(
    (a) => a.accountNumber === displayForm.fromAccount,
  )?.accountId

  /**
   * 지금 폼이 가리키는 거래(REQ-TRSF-016). 실행 요청 본문과 OTP 거래정보를 모두
   * 이 값에서 만들어, 거래 내용을 말하는 자리를 하나로 둔다.
   */
  const currentIntent: TransferIntent = {
    withdrawalAccountId: selectedAccountId ?? null,
    depositAccountNumber: form.toAccount,
    amount: form.amount,
    myPassbookMemo: form.myMemo,
    recipientPassbookMemo: form.payeeMemo,
  }

  /** REQ-TRSF-004·007·030: 입금계좌번호를 조회해 예금주·계좌유형·동일계좌 여부를 검증한다. */
  const resolveToAccount = async (accountNo: string) => {
    if (accountNo.length !== 12) {
      setForm((f) => ({
        ...f,
        toAccount: accountNo,
        toConfirmed: false,
        payeeName: "",
        toAccountError: "입금계좌번호 12자리를 정확히 입력하세요.",
      }))
      return
    }
    if (accountNo === displayForm.fromAccount) {
      setForm((f) => ({
        ...f,
        toAccount: accountNo,
        toConfirmed: false,
        payeeName: "",
        toAccountError:
          "출금계좌와 입금계좌가 동일합니다. 다른 계좌를 입력하세요.",
      }))
      return
    }
    try {
      const payee = await fetchPayee(accountNo)
      setForm((f) => ({
        ...f,
        toAccount: accountNo,
        toConfirmed: true,
        payeeName: payee.payeeName ?? "",
        toAccountError: null,
      }))
    } catch (error) {
      setForm((f) => ({
        ...f,
        toAccount: accountNo,
        toConfirmed: false,
        payeeName: "",
        toAccountError:
          error instanceof ApiError
            ? error.message
            : "입금계좌를 조회하지 못했습니다. 계좌번호를 확인하세요.",
      }))
    }
  }

  const canSubmit =
    !isLimitUnavailable &&
    !isAccountsLoading &&
    form.password.length === 4 &&
    form.toConfirmed &&
    form.amount != null &&
    form.amount > 0 &&
    form.amount <= effectiveLimit

  if (step === 2) {
    const amount = currentIntent.amount ?? 0
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

    const handleConfirmDialogConfirm = async () => {
      setConfirmOpen(false)
      if (selectedAccountId == null) {
        setAuthError(
          "출금계좌를 확인할 수 없습니다. 이전 단계에서 다시 선택하세요.",
        )
        return
      }
      try {
        const verified = await verifyPasswordMutation.mutateAsync({
          accountId: selectedAccountId,
          data: { accountPassword: form.password },
        })
        // 평문 비밀번호는 검증 직후 지운다.
        setField("password", "")
        verifyPasswordMutation.reset()

        if (!verified.accountPasswordAuthToken) {
          setAuthError(
            "계좌비밀번호 인증 토큰을 발급받지 못했습니다. 다시 시도하세요.",
          )
          return
        }
        setPasswordAuthToken(verified.accountPasswordAuthToken)
        setAuthError(null)
        // REQ-TRSF-016: 미상으로 끝난 실행을 같은 내용으로 다시 보낼 때만 키를
        // 유지한다. 내용이 달라졌으면 다른 거래라 새 키를 쓴다 — 같은 키로 보내면
        // 서버가 앞선 거래의 결과를 돌려주고 화면은 바뀐 내용으로 이체된 것처럼
        // 표시한다.
        if (!isSameTransferIntent(keyedIntent, currentIntent)) {
          setIdempotencyKey(crypto.randomUUID())
          setKeyedIntent(currentIntent)
        }
        setOtpOpen(true)
      } catch (error) {
        // 실패했어도 컴포넌트 state 와 mutation variables 에 평문을 남기지 않는다.
        setField("password", "")
        verifyPasswordMutation.reset()
        setAuthError(
          error instanceof ApiError
            ? error.message
            : "계좌비밀번호 확인에 실패했습니다. 다시 시도하세요.",
        )
        setStep(1)
      }
    }

    const handleOtpConfirm = async (otpAuthToken: string) => {
      setOtpOpen(false)
      if (selectedAccountId == null || passwordAuthToken == null) {
        setAuthError(
          "인증 정보를 확인할 수 없습니다. 처음부터 다시 시도하세요.",
        )
        return
      }
      const executedAt = transactionAt ?? getNow()
      try {
        const executed = await executeMutation.mutateAsync({
          request: toTransferRequest(currentIntent),
          accountPasswordAuthToken: passwordAuthToken,
          otpAuthToken,
          idempotencyKey,
        })

        const settled = executed.status === TransferResponseStatus.SUCCESS
        const failed = executed.status === TransferResponseStatus.ERROR
        if (
          !settled &&
          !failed &&
          executed.status !== TransferResponseStatus.PROCESSING
        ) {
          console.error("알 수 없는 이체 처리상태", executed.status)
        }

        // 미확정 건은 서버가 거래일시·이체후잔액을 주지 않는다. 화면에서 만들어내면
        // 끝나지 않은 이체를 끝난 것처럼 보여주게 된다(REQ-TRSF-017·018).
        const row: TransferResultRow = {
          transactionId: executed.transactionNumber ?? "-",
          processedAt: settled ? (executed.transferredAt ?? executedAt) : "",
          fromAccountNo: displayForm.fromAccount,
          toAccountNo: form.toAccount,
          payeeName: form.payeeName,
          amount,
          fee: 0,
          memo: form.payeeMemo || "-",
          // 미확정·실패 건은 서버가 잔액을 주지 않는다. 이체 전 잔액으로 채우면
          // 처리되지 않은 이체를 반영된 것처럼 보여준다(REQ-TRSF-018).
          balanceAfter: executed.withdrawalBalanceAfter ?? 0,
        }

        // 200 이어도 이체 성공이 아니다. 본문 status 로 판단한다.
        if (failed) {
          setResult({
            variant: "fail",
            row,
            errorCode: executed.errorCode ?? undefined,
            failReason:
              executed.errorMessage ??
              "이체가 처리되지 않았습니다. 잠시 후 다시 시도하세요.",
          })
        } else if (settled) {
          setResult({ variant: "success", row })
        } else {
          setResult({
            variant: "pending",
            row,
            failReason:
              "이체 결과가 아직 확정되지 않았습니다. 이체결과조회에서 처리 상태를 확인하세요.",
          })
        }

        // 잔액·한도·최근 거래일시는 서버가 계산한다. 캐시만 무효화한다.
        void queryClient.invalidateQueries({
          queryKey: getLoginStatusQueryKey(),
        })
        void queryClient.invalidateQueries({
          queryKey: getTransferLimitQueryKey(),
        })
        void queryClient.invalidateQueries({
          queryKey: getAccountOverviewQueryKey(),
        })
      } catch (error) {
        // 계좌비밀번호는 검증 직후 지웠고 재입력 지점이 1단계뿐이라, 여기서 2단계에
        // 머무르면 다음 시도가 빈 비밀번호로 나간다.
        setAuthError(
          error instanceof ApiError
            ? error.message
            : "이체 실행에 실패했습니다. 계좌비밀번호를 다시 입력해 주세요.",
        )
        setPasswordAuthToken(null)
        setStep(1)
        return
      }
      // 서버가 SUCCESS·ERROR·PROCESSING 으로 답했으면 요청이 접수된 것이다.
      // 다음 이체는 새 키를 쓴다.
      setIdempotencyKey("")
      setKeyedIntent(null)
      setPasswordAuthToken(null)
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
              {selectedAccount?.alias}{" "}
              {formatAccountNo(displayForm.fromAccount)}
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
              value: formatAccountNo(displayForm.fromAccount),
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
          onConfirm={(otpAuthToken) => void handleOtpConfirm(otpAuthToken)}
          transaction={{
            type: OtpTransactionType.IMMEDIATE_TRANSFER,
            data: toOtpTransactionData(currentIntent),
          }}
          title="즉시이체 OTP 인증"
          guide="즉시이체 실행을 위해 OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하세요."
        />
      </>
    )
  }

  if (step === 3 && result) {
    const isSuccess = result.variant === "success"
    const isPending = result.variant === "pending"
    const row = result.row

    const columns: DataGridColumn<TransferResultRow>[] = [
      {
        key: "result",
        header: "결과",
        align: "center",
        width: 70,
        render: () => (
          <Badge
            variant={isSuccess ? "success" : isPending ? "warning" : "danger"}
          >
            {isSuccess ? "정상" : isPending ? "처리중" : "오류"}
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
        render: (r) => (
          <span>{r.processedAt ? formatDateTime(r.processedAt) : "-"}</span>
        ),
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
        render: (r) =>
          isSuccess ? formatAmount(r.balanceAfter, { suffix: false }) : "-",
      },
    ]

    const favorites = favoriteAccountsQuery.data ?? []
    const alreadyFrequent = favorites.some(
      (a) => a.depositAccountNumber === row.toAccountNo,
    )
    const frequentFull = favorites.length >= FREQUENT_TRANSFER_ACCOUNT_MAX

    const handleRegisterFrequent = async () => {
      if (alreadyFrequent || frequentFull) return
      try {
        await registerFavoriteMutation.mutateAsync({
          request: {
            depositAccountNumber: row.toAccountNo,
            alias: row.payeeName,
          },
          idempotencyKey: crypto.randomUUID(),
        })
        await queryClient.invalidateQueries({
          queryKey: getFavoriteAccountsQueryKey(),
        })
        setFavoriteError(null)
      } catch (error) {
        setFavoriteError(
          error instanceof ApiError
            ? error.message
            : "자주 쓰는 계좌 등록에 실패했습니다.",
        )
      }
    }

    return (
      <InstantTransferStep3
        steps={STEPS}
        actionError={favoriteError}
        onNewTransfer={() => {
          setForm(INITIAL_FORM)
          setResult(null)
          setAuthError(null)
          setFavoriteError(null)
          setIdempotencyKey("")
          setKeyedIntent(null)
          setStep(1)
        }}
        resultSlot={
          <ResultPanel
            variant={result.variant}
            message={
              isSuccess
                ? "이체가 완료되었습니다."
                : isPending
                  ? "이체 결과를 확인하는 중입니다."
                  : "이체가 처리되지 않았습니다."
            }
            description={
              isSuccess || isPending
                ? isPending
                  ? (result.failReason ?? "")
                  : "이체결과조회에서 처리 내역을 확인할 수 있습니다."
                : result.errorCode
                  ? `${result.failReason} (오류코드 ${result.errorCode})`
                  : (result.failReason ?? "")
            }
            highlightValue={formatAmount(row.amount)}
            footnote={
              isSuccess
                ? "※ 이체 후 출금계좌 잔액은 이체결과조회에서 다시 확인할 수 있습니다."
                : isPending
                  ? "※ 결과가 확정되기 전까지 잔액과 거래내역이 달라질 수 있습니다. 같은 이체를 다시 실행하지 마세요."
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
                    disabled={
                      alreadyFrequent ||
                      frequentFull ||
                      registerFavoriteMutation.isPending
                    }
                    onClick={() => void handleRegisterFrequent()}
                  >
                    {registerFavoriteMutation.isPending
                      ? "등록 중..."
                      : alreadyFrequent
                        ? "자주 쓰는 계좌 등록됨"
                        : frequentFull
                          ? `자주 쓰는 계좌 ${FREQUENT_TRANSFER_ACCOUNT_MAX}건 초과`
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
      accounts={accounts}
      form={displayForm}
      onChange={setField}
      perTransferLimit={perTransferLimit}
      dailyRemaining={dailyRemaining}
      isLimitUnavailable={isLimitUnavailable}
      canSubmit={canSubmit}
      notice={[authError, limitNotice].filter(Boolean).join(" ") || null}
      onNext={() => {
        // 1단계 안내를 보고 다시 진행하는 것이므로 이전 시도의 문구를 지운다.
        // 남겨두면 2단계가 열리자마자 아직 누르지도 않은 실패가 떠 있다.
        setAuthError(null)
        setStep(2)
      }}
      onConfirmAccount={() => void resolveToAccount(form.toAccount)}
      onSelectQuickAccount={(accountNo) => void resolveToAccount(accountNo)}
      frequentAccounts={frequentAccounts}
      recentAccounts={MOCK_RECENT_TRANSFER_ACCOUNTS}
    />
  )
}
