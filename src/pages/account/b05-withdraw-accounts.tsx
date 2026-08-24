import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Alert } from "@/shared/ui/alert"
import { Modal } from "@/shared/ui/modal"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { ErrorDialog } from "@/shared/ui/error-dialog"
import { OtpModal, OtpTransactionType } from "@/entities/auth"
import {
  getAccountOverviewQueryKey,
  useAccountOverviewQuery,
  useRegisterWithdrawalAccountMutation,
  useUnregisterWithdrawalAccountMutation,
  useVerifyAccountPasswordMutation,
} from "@/entities/account"
import { ApiError } from "@/shared/api/api-error"
import { formatAccountNo, formatAmount } from "@/shared/lib/format"
import { onlyDigits } from "@/shared/lib/input-filter"

const PASSWORD_LIMIT = 4

type WithdrawalAccountRow = {
  id: string
  accountId: number
  accountNo: string
  alias: string
  balance: number
  registered: boolean
}

/** REQ-ACCT-010·011·012: 출금계좌관리. 등록/미등록 목록을 상하로 구분해 표시한다. */
export const B05WithdrawAccounts = () => {
  const queryClient = useQueryClient()
  const accountOverviewQuery = useAccountOverviewQuery()
  const verifyPasswordMutation = useVerifyAccountPasswordMutation()
  const registerMutation = useRegisterWithdrawalAccountMutation()
  const unregisterMutation = useUnregisterWithdrawalAccountMutation()

  const accounts = React.useMemo<WithdrawalAccountRow[]>(
    () =>
      (accountOverviewQuery.data?.items ?? [])
        .flatMap((group) => group.accounts ?? [])
        .flatMap((account) => {
          if (
            account.accountType !== "DEMAND_DEPOSIT" ||
            account.accountId == null ||
            account.accountNumber == null
          ) {
            return []
          }

          return [
            {
              id: String(account.accountId),
              accountId: account.accountId,
              accountNo: account.accountNumber,
              alias: account.accountName ?? "입출금통장",
              balance: account.balance ?? 0,
              registered: account.withdrawalRegistered === true,
            },
          ]
        }),
    [accountOverviewQuery.data],
  )

  const [registeredSelected, setRegisteredSelected] = React.useState<string[]>(
    [],
  )
  const [unregisteredSelected, setUnregisteredSelected] = React.useState<
    string[]
  >([])

  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  )

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [deleteBlocked, setDeleteBlocked] = React.useState<string[] | null>(
    null,
  )

  const [registerQueue, setRegisterQueue] = React.useState<
    WithdrawalAccountRow[] | null
  >(null)
  const [queueIndex, setQueueIndex] = React.useState(0)
  const [pwValue, setPwValue] = React.useState("")
  const [pwError, setPwError] = React.useState<string | null>(null)
  const [accountPasswordAuthToken, setAccountPasswordAuthToken] =
    React.useState<string | null>(null)
  const [otpOpen, setOtpOpen] = React.useState(false)
  const [registerError, setRegisterError] = React.useState<string[] | null>(
    null,
  )
  const [registrationSuccessCount, setRegistrationSuccessCount] =
    React.useState(0)

  const registered = accounts.filter((account) => account.registered)
  const unregistered = accounts.filter((account) => !account.registered)

  const registeredRows = registered.filter((account) =>
    registeredSelected.includes(account.id),
  )
  const unregisteredRows = unregistered.filter((account) =>
    unregisteredSelected.includes(account.id),
  )

  const columns: DataGridColumn<WithdrawalAccountRow>[] = [
    { key: "alias", header: "계좌명", width: 200 },
    {
      key: "accountNo",
      header: "계좌번호",
      width: 180,
      render: (row) => <span>{formatAccountNo(row.accountNo)}</span>,
    },
    {
      key: "balance",
      header: "잔액",
      align: "right",
      width: 160,
      render: (row) => formatAmount(row.balance),
    },
  ]

  const handleDeleteClick = () => {
    setSuccessMessage(null)
    setDeleteBlocked(null)

    if (registeredRows.length === 0) return

    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    setDeleteConfirmOpen(false)

    const failures: string[] = []
    let successCount = 0

    for (const account of registeredRows) {
      try {
        await unregisterMutation.mutateAsync({
          accountId: account.accountId,
        })

        successCount += 1
      } catch (error) {
        failures.push(
          `${account.alias} (${formatAccountNo(account.accountNo)}) : ${
            error instanceof ApiError
              ? error.message
              : "출금계좌 삭제 중 오류가 발생했습니다."
          }`,
        )
      }
    }

    unregisterMutation.reset()

    await queryClient.invalidateQueries({
      queryKey: getAccountOverviewQueryKey(),
    })

    setRegisteredSelected([])

    if (successCount > 0) {
      setSuccessMessage(
        successCount === 1
          ? "선택한 계좌의 출금계좌 등록이 해제되었습니다."
          : `${successCount}개 계좌의 출금계좌 등록이 해제되었습니다.`,
      )
    }

    if (failures.length > 0) {
      setDeleteBlocked(failures)
    }
  }

  const handleRegisterClick = () => {
    setSuccessMessage(null)
    setRegisterError(null)

    if (unregisteredRows.length === 0) return

    setRegisterQueue(unregisteredRows)
    setQueueIndex(0)
    setRegistrationSuccessCount(0)
    setPwValue("")
    setPwError(null)
    setAccountPasswordAuthToken(null)
    setOtpOpen(false)
  }

  const currentTarget = registerQueue?.[queueIndex] ?? null

  const closeRegisterFlow = () => {
    setRegisterQueue(null)
    setQueueIndex(0)
    setRegistrationSuccessCount(0)
    setPwValue("")
    setPwError(null)
    setAccountPasswordAuthToken(null)
    setOtpOpen(false)

    verifyPasswordMutation.reset()
    registerMutation.reset()
  }

  const handleRegisterCancel = () => {
    if (registrationSuccessCount > 0) {
      setSuccessMessage(
        registrationSuccessCount === 1
          ? "1개 계좌가 출금계좌로 등록되었습니다."
          : `${registrationSuccessCount}개 계좌가 출금계좌로 등록되었습니다.`,
      )
    }

    closeRegisterFlow()
    setUnregisteredSelected([])
  }

  const handlePasswordConfirm = async () => {
    if (!currentTarget) return

    if (pwValue.length !== PASSWORD_LIMIT) {
      setPwError("계좌비밀번호 4자리를 모두 입력하세요.")
      return
    }

    setPwError(null)
    setAccountPasswordAuthToken(null)

    try {
      const response = await verifyPasswordMutation.mutateAsync({
        accountId: currentTarget.accountId,
        data: {
          accountPassword: pwValue,
        },
      })

      // mutation variables와 화면 state에 평문 비밀번호를 남기지 않는다.
      setPwValue("")
      verifyPasswordMutation.reset()

      if (!response.accountPasswordAuthToken) {
        setRegisterError([
          "계좌비밀번호 인증 토큰을 발급받지 못했습니다.",
          "다시 시도해 주세요.",
        ])
        return
      }

      setAccountPasswordAuthToken(response.accountPasswordAuthToken)
      setOtpOpen(true)
    } catch (error) {
      setPwValue("")
      verifyPasswordMutation.reset()

      setPwError(
        error instanceof ApiError
          ? error.message
          : "계좌비밀번호 확인 중 오류가 발생했습니다.",
      )
    }
  }

  const handleOtpConfirm = async (otpAuthToken: string) => {
    if (!currentTarget || !accountPasswordAuthToken) {
      setRegisterError([
        "출금계좌 등록 인증 정보를 확인할 수 없습니다.",
        "처음부터 다시 시도해 주세요.",
      ])
      handleRegisterCancel()
      return
    }

    setOtpOpen(false)

    try {
      await registerMutation.mutateAsync({
        accountId: currentTarget.accountId,
        data: {
          accountPasswordAuthToken,
          otpAuthToken,
        },
      })

      // 최종 API에서 인증 토큰이 소비되므로 즉시 제거한다.
      registerMutation.reset()
      setAccountPasswordAuthToken(null)

      const completedCount = registrationSuccessCount + 1
      setRegistrationSuccessCount(completedCount)

      await queryClient.invalidateQueries({
        queryKey: getAccountOverviewQueryKey(),
      })

      const hasNext =
        registerQueue != null && queueIndex + 1 < registerQueue.length

      if (hasNext) {
        setQueueIndex((index) => index + 1)
        setPwValue("")
        setPwError(null)
        return
      }

      setUnregisteredSelected([])
      setSuccessMessage(
        completedCount === 1
          ? "선택한 계좌가 출금계좌로 등록되었습니다."
          : `${completedCount}개 계좌가 출금계좌로 등록되었습니다.`,
      )
      closeRegisterFlow()
    } catch (error) {
      // 최종 API에서 토큰이 소비됐을 가능성이 있으므로 재사용하지 않는다.
      registerMutation.reset()
      setAccountPasswordAuthToken(null)

      await queryClient.invalidateQueries({
        queryKey: getAccountOverviewQueryKey(),
      })

      const errorMessage =
        error instanceof ApiError
          ? error.message
          : "출금계좌 등록 중 오류가 발생했습니다."

      const remainingCount = (registerQueue?.length ?? 0) - queueIndex - 1

      if (registrationSuccessCount > 0) {
        setSuccessMessage(
          registrationSuccessCount === 1
            ? "1개 계좌가 출금계좌로 등록되었습니다."
            : `${registrationSuccessCount}개 계좌가 출금계좌로 등록되었습니다.`,
        )
      }

      setRegisterError([
        `${currentTarget.alias} (${formatAccountNo(
          currentTarget.accountNo,
        )}) : ${errorMessage}`,
        ...(remainingCount > 0
          ? [`남은 ${remainingCount}개 계좌의 등록은 진행하지 않았습니다.`]
          : []),
      ])

      setUnregisteredSelected([])
      closeRegisterFlow()
    }
  }

  return (
    <QueryPageLayout
      noticeItems={[
        "등록된 출금계좌와 미등록 계좌를 각각 체크박스로 선택합니다.",
        "출금계좌 등록 시 해당 계좌의 계좌비밀번호 검증과 OTP 인증이 필요합니다.",
        "대기 상태의 예약이체 또는 정상 상태의 자동이체가 등록된 계좌는 삭제할 수 없습니다.",
      ]}
      footerItems={[
        "대기 상태의 예약이체 또는 정상 상태의 자동이체가 등록된 계좌는 삭제할 수 없으며, 삭제 시도 시 사유가 계좌별로 안내됩니다(REQ-ACCT-011).",
        "출금계좌 등록은 계좌비밀번호 검증과 OTP 인증을 모두 완료해야 처리됩니다(REQ-ACCT-010).",
        "등록 해제된 계좌는 즉시이체의 출금계좌로 선택할 수 없으며, 다시 등록해야 이용할 수 있습니다.",
      ]}
      modals={
        <>
          <ConfirmDialog
            open={deleteConfirmOpen}
            onClose={() => setDeleteConfirmOpen(false)}
            onConfirm={handleConfirmDelete}
            title="출금계좌 삭제"
            messages={[
              "선택한 계좌의 출금계좌 등록을 해제합니다.",
              "해제 후에는 해당 계좌로 즉시이체를 할 수 없습니다.",
            ]}
            confirmLabel="삭제하기"
            items={registeredRows.map((row) => ({
              label: row.alias,
              value: formatAccountNo(row.accountNo),
            }))}
          />

          <ErrorDialog
            open={deleteBlocked != null}
            onClose={() => setDeleteBlocked(null)}
            title="삭제 실패"
            messages={deleteBlocked ?? []}
          />

          <ErrorDialog
            open={registerError != null}
            onClose={() => setRegisterError(null)}
            title="출금계좌 등록 실패"
            messages={registerError ?? []}
          />

          <Modal
            open={
              registerQueue != null &&
              !otpOpen &&
              accountPasswordAuthToken == null
            }
            onClose={handleRegisterCancel}
            title="계좌비밀번호 확인"
            size="sm"
            footer={
              <>
                <Button
                  variant="secondary"
                  size="lg"
                  className="min-w-30"
                  onClick={handleRegisterCancel}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  className="min-w-30"
                  disabled={verifyPasswordMutation.isPending}
                  onClick={handlePasswordConfirm}
                >
                  확인
                </Button>
              </>
            }
          >
            {currentTarget && (
              <div className="flex flex-col gap-3">
                <p className="text-base text-ink-muted">
                  {registerQueue && registerQueue.length > 1
                    ? `${queueIndex + 1}/${registerQueue.length}번째 계좌의 비밀번호를 입력하세요.`
                    : "출금계좌로 등록할 계좌의 비밀번호를 입력하세요."}
                </p>

                <p className="text-base font-bold text-ink">
                  {currentTarget.alias} /{" "}
                  {formatAccountNo(currentTarget.accountNo)}
                </p>

                <Input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={PASSWORD_LIMIT}
                  value={pwValue}
                  invalid={pwError != null}
                  disabled={verifyPasswordMutation.isPending}
                  onChange={(event) => {
                    setPwValue(onlyDigits(event.target.value, PASSWORD_LIMIT))

                    if (pwError) {
                      setPwError(null)
                    }
                  }}
                  placeholder="계좌비밀번호 4자리"
                  className="text-center tracking-4"
                  autoFocus
                />

                {pwError && (
                  <p role="alert" className="text-base font-bold text-danger">
                    {pwError}
                  </p>
                )}
              </div>
            )}
          </Modal>

          {currentTarget && (
            <OtpModal
              open={otpOpen && accountPasswordAuthToken != null}
              onClose={handleRegisterCancel}
              onConfirm={handleOtpConfirm}
              title="출금계좌 등록 OTP 인증"
              guide="출금계좌 등록을 위해 OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하세요."
              transaction={{
                type: OtpTransactionType.WITHDRAWAL_ACCOUNT_REGISTER,
                data: {
                  accountId: currentTarget.accountId,
                },
              }}
            />
          )}
        </>
      }
    >
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      <FormSection
        title="등록된 출금계좌"
        action={
          <Button
            variant="danger"
            size="sm"
            disabled={
              registeredSelected.length === 0 || unregisterMutation.isPending
            }
            onClick={handleDeleteClick}
          >
            선택 계좌 삭제
          </Button>
        }
      >
        <DataGrid
          columns={columns}
          rows={registered}
          rowKey={(row) => row.id}
          selectable
          selectedKeys={registeredSelected}
          onSelectionChange={setRegisteredSelected}
          loading={accountOverviewQuery.isFetching}
          emptyMessage="등록된 출금계좌가 없습니다."
        />
      </FormSection>

      <FormSection
        title="미등록 계좌"
        className="mb-0"
        action={
          <Button
            variant="primary"
            size="sm"
            disabled={
              unregisteredSelected.length === 0 || registerQueue != null
            }
            onClick={handleRegisterClick}
          >
            선택 계좌 등록
          </Button>
        }
      >
        <DataGrid
          columns={columns}
          rows={unregistered}
          rowKey={(row) => row.id}
          selectable
          selectedKeys={unregisteredSelected}
          onSelectionChange={setUnregisteredSelected}
          loading={accountOverviewQuery.isFetching}
          emptyMessage="미등록 계좌가 없습니다."
        />
      </FormSection>
    </QueryPageLayout>
  )
}
