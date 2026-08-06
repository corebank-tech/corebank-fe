import * as React from "react"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Alert } from "@/shared/ui/alert"
import { Modal } from "@/shared/ui/modal"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { ErrorDialog } from "@/shared/ui/error-dialog"
import { OtpModal } from "@/entities/auth"
import { formatAccountNo, formatAmount } from "@/shared/lib/format"
import {
  MOCK_WITHDRAWAL_ACCOUNTS,
  type WithdrawalAccount,
} from "@/entities/account"
import { MOCK_AUTO_TRANSFERS, MOCK_RESERVATIONS } from "@/entities/transfer"
import { getWithdrawalDeleteBlockReason } from "@/features/withdrawal-account"
import { onlyDigits } from "@/shared/lib/input-filter"

const PASSWORD_LIMIT = 4

/** REQ-ACCT-010·011·012: 출금계좌관리. 등록/미등록 목록을 상하로 구분해 표시한다. */
export const B05WithdrawAccounts = () => {
  const [accounts, setAccounts] = React.useState(MOCK_WITHDRAWAL_ACCOUNTS)
  const [registeredSelected, setRegisteredSelected] = React.useState<string[]>(
    [],
  )
  const [unregisteredSelected, setUnregisteredSelected] = React.useState<
    string[]
  >([])
  const [gridKey, setGridKey] = React.useState(0)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  )

  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [deleteBlocked, setDeleteBlocked] = React.useState<string[] | null>(
    null,
  )

  const [registerQueue, setRegisterQueue] = React.useState<
    WithdrawalAccount[] | null
  >(null)
  const [queueIndex, setQueueIndex] = React.useState(0)
  const [pwValue, setPwValue] = React.useState("")
  const [pwError, setPwError] = React.useState<string | null>(null)
  const [otpOpen, setOtpOpen] = React.useState(false)

  const registered = accounts.filter((a) => a.registered)
  const unregistered = accounts.filter((a) => !a.registered)

  const registeredRows = registered.filter((a) =>
    registeredSelected.includes(a.id),
  )
  const unregisteredRows = unregistered.filter((a) =>
    unregisteredSelected.includes(a.id),
  )

  const columns: DataGridColumn<WithdrawalAccount>[] = [
    { key: "alias", header: "계좌명", width: 200 },
    {
      key: "accountNo",
      header: "계좌번호",
      width: 180,
      render: (r) => (
        <span className="tabular-nums">{formatAccountNo(r.accountNo)}</span>
      ),
    },
    {
      key: "balance",
      header: "잔액",
      align: "right",
      width: 160,
      render: (r) => formatAmount(r.balance),
    },
  ]

  const handleDeleteClick = () => {
    setSuccessMessage(null)
    if (registeredRows.length === 0) return
    const blocked = registeredRows
      .map((r) => ({
        r,
        reason: getWithdrawalDeleteBlockReason(
          r.accountNo,
          MOCK_RESERVATIONS,
          MOCK_AUTO_TRANSFERS,
        ),
      }))
      .filter(
        (x): x is { r: WithdrawalAccount; reason: string } => x.reason != null,
      )
    if (blocked.length > 0) {
      setDeleteBlocked(
        blocked.map(
          ({ r, reason }) =>
            `${r.alias} (${formatAccountNo(r.accountNo)}) : ${reason}`,
        ),
      )
      return
    }
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    setAccounts((prev) =>
      prev.map((a) =>
        registeredSelected.includes(a.id) ? { ...a, registered: false } : a,
      ),
    )
    setDeleteConfirmOpen(false)
    setRegisteredSelected([])
    setGridKey((k) => k + 1)
    setSuccessMessage("선택한 계좌의 출금계좌 등록이 해제되었습니다.")
  }

  const handleRegisterClick = () => {
    setSuccessMessage(null)
    if (unregisteredRows.length === 0) return
    setRegisterQueue(unregisteredRows)
    setQueueIndex(0)
    setPwValue("")
    setPwError(null)
  }

  const currentTarget = registerQueue?.[queueIndex] ?? null

  const closeRegisterFlow = () => {
    setRegisterQueue(null)
    setQueueIndex(0)
    setPwValue("")
    setPwError(null)
    setOtpOpen(false)
  }

  const handlePasswordConfirm = () => {
    if (!currentTarget) return
    if (pwValue.length !== PASSWORD_LIMIT) {
      setPwError("계좌비밀번호 4자리를 모두 입력하세요.")
      return
    }
    if (pwValue !== currentTarget.mockPassword) {
      setPwError("계좌비밀번호가 일치하지 않습니다.")
      return
    }
    if (registerQueue && queueIndex + 1 < registerQueue.length) {
      setQueueIndex((i) => i + 1)
      setPwValue("")
      setPwError(null)
      return
    }
    setOtpOpen(true)
  }

  const handleOtpConfirm = () => {
    const ids = new Set((registerQueue ?? []).map((a) => a.id))
    setAccounts((prev) =>
      prev.map((a) => (ids.has(a.id) ? { ...a, registered: true } : a)),
    )
    setUnregisteredSelected([])
    setGridKey((k) => k + 1)
    setSuccessMessage("선택한 계좌가 출금계좌로 등록되었습니다.")
    closeRegisterFlow()
  }

  return (
    <QueryPageLayout
      noticeItems={[
        "등록된 출금계좌와 미등록 계좌를 각각 체크박스로 선택합니다.",
        "출금계좌 등록 시 해당 계좌의 계좌비밀번호 검증과 OTP 인증이 필요합니다.",
        "대기 상태의 예약이체 또는 정상 상태의 자동이체가 등록된 계좌는 삭제할 수 없습니다.",
      ]}
      footerItems={[
        "예약 상태의 예약이체 또는 정상 상태의 자동이체가 등록된 계좌는 삭제할 수 없으며, 삭제 시도 시 사유가 계좌별로 안내됩니다(REQ-ACCT-011).",
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
            items={registeredRows.map((r) => ({
              label: r.alias,
              value: formatAccountNo(r.accountNo),
            }))}
          />

          <ErrorDialog
            open={deleteBlocked != null}
            onClose={() => setDeleteBlocked(null)}
            title="삭제 불가"
            messages={deleteBlocked ?? []}
          />

          <Modal
            open={registerQueue != null && !otpOpen}
            onClose={closeRegisterFlow}
            title="계좌비밀번호 확인"
            size="sm"
            footer={
              <>
                <Button
                  variant="secondary"
                  size="lg"
                  className="min-w-30"
                  onClick={closeRegisterFlow}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  className="min-w-30"
                  onClick={handlePasswordConfirm}
                >
                  {registerQueue && queueIndex + 1 < registerQueue.length
                    ? "다음"
                    : "확인"}
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
                  onChange={(e) => {
                    setPwValue(onlyDigits(e.target.value, PASSWORD_LIMIT))
                    if (pwError) setPwError(null)
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

          <OtpModal
            open={otpOpen}
            onClose={closeRegisterFlow}
            onConfirm={handleOtpConfirm}
            guide="출금계좌 등록을 위해 OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하세요."
          />
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
            disabled={registeredSelected.length === 0}
            onClick={handleDeleteClick}
          >
            선택 계좌 삭제
          </Button>
        }
      >
        <DataGrid
          key={`reg-${gridKey}`}
          columns={columns}
          rows={registered}
          rowKey={(r) => r.id}
          selectable
          onSelectionChange={setRegisteredSelected}
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
            disabled={unregisteredSelected.length === 0}
            onClick={handleRegisterClick}
          >
            선택 계좌 등록
          </Button>
        }
      >
        <DataGrid
          key={`unreg-${gridKey}`}
          columns={columns}
          rows={unregistered}
          rowKey={(r) => r.id}
          selectable
          onSelectionChange={setUnregisteredSelected}
          emptyMessage="미등록 계좌가 없습니다."
        />
      </FormSection>
    </QueryPageLayout>
  )
}
