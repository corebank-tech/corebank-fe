import * as React from "react"
import { OtpModal, OtpTransactionType } from "@/entities/auth"
import {
  AUTO_TRANSFER_CYCLE_LABEL as CYCLE_LABEL,
  type AutoTransferRow,
  type TransferCycle,
} from "@/entities/transfer"
import { RadioRowField } from "@/widgets/query"
import { TransferEndDateField } from "@/widgets/transfer"
import { addMonths, daysBetween } from "@/shared/lib/date"
import {
  formatAccountNo,
  formatAmount,
  formatDate,
  maskName,
} from "@/shared/lib/format"
import { Button } from "@/shared/ui/button"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { FormRow } from "@/shared/ui/form-row"
import { Input } from "@/shared/ui/input"
import { Modal } from "@/shared/ui/modal"

/** 이체종료일은 시작일 이후부터 시작일 기준 최대 60개월 이내여야 한다. */
const isEndDateValid = (
  startDate: string,
  endDate: string,
  maxMonths = 60,
): boolean => {
  if (!endDate) return false
  const isAfterStart = daysBetween(startDate, endDate) > 0
  const maximumEndDate = addMonths(startDate, maxMonths)
  const isWithinMaximum =
    daysBetween(startDate, endDate) <= daysBetween(startDate, maximumEndDate)
  return isAfterStart && isWithinMaximum
}

type EditForm = {
  amount: string
  cycleMonths: TransferCycle
  endDate: string
  memo: string
}

type Props = {
  target: AutoTransferRow
  onClose: () => void
  /** 변경 요청의 성공 여부를 돌려준다. 실패하면 모달을 닫지 않는다. */
  onSave: (
    updatedRow: AutoTransferRow,
    otpAuthToken: string,
  ) => Promise<boolean>
}

export const G04AutoTransferEditFlow = ({ target, onClose, onSave }: Props) => {
  const [editForm, setEditForm] = React.useState<EditForm>({
    amount: String(target.amount),
    cycleMonths: target.cycleMonths,
    endDate: target.endDate,
    memo: target.memo,
  })
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false)
  const [isOtpOpen, setIsOtpOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  const handleConfirm = () => {
    setIsConfirmOpen(false)
    setIsOtpOpen(true)
  }

  // 결과를 기다린 뒤 성공했을 때만 닫는다. 먼저 닫으면 PATCH가 실패했을 때
  // 입력값이 이미 사라진 뒤에 에러만 뜨고, 사용자는 처음부터 다시 입력해야 한다.
  const handleOtpConfirm = async (otpAuthToken: string) => {
    if (isSaving) return
    setIsSaving(true)
    const saved = await onSave(
      {
        ...target,
        amount: Number(editForm.amount) || target.amount,
        cycleMonths: editForm.cycleMonths,
        endDate: editForm.endDate,
        memo: editForm.memo,
      },
      otpAuthToken,
    )
    setIsSaving(false)
    // OTP는 이미 소진됐으므로 실패해도 OTP 모달은 닫고, 재시도는 새로 발급받는다.
    setIsOtpOpen(false)
    if (saved) onClose()
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="자동이체 변경"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="lg"
              className="min-w-30"
              onClick={onClose}
            >
              취소
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="min-w-30"
              disabled={
                isSaving ||
                !(Number(editForm.amount) > 0) ||
                !isEndDateValid(target.startDate, editForm.endDate)
              }
              onClick={() => setIsConfirmOpen(true)}
            >
              변경하기
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-0">
          <FormRow label="출금계좌" labelWidth={110}>
            <span className="text-ink-muted">
              {target.fromAlias} / {formatAccountNo(target.fromAccountNo)}
              <span className="ml-1 text-2xs text-ink-faint">(변경 불가)</span>
            </span>
          </FormRow>
          <FormRow label="입금계좌" labelWidth={110}>
            <span className="text-ink-muted">
              {formatAccountNo(target.toAccountNo)} (
              {maskName(target.payeeName)})
              <span className="ml-1 text-2xs text-ink-faint">(변경 불가)</span>
            </span>
          </FormRow>
          <FormRow label="이체금액" htmlFor="g04-edit-amount" labelWidth={110}>
            <Input
              id="g04-edit-amount"
              type="number"
              step={10000}
              value={editForm.amount}
              onChange={(event) =>
                setEditForm({ ...editForm, amount: event.target.value })
              }
            />
          </FormRow>
          <FormRow label="이체주기" labelWidth={110}>
            <RadioRowField
              name="g04-edit-cycle"
              options={[
                { label: "1개월", value: "1" },
                { label: "3개월", value: "3" },
                { label: "6개월", value: "6" },
              ]}
              value={String(editForm.cycleMonths)}
              onChange={(cycleMonths) =>
                setEditForm({
                  ...editForm,
                  cycleMonths: Number(cycleMonths) as TransferCycle,
                })
              }
            />
          </FormRow>
          <FormRow label="이체종료일" htmlFor="g04-edit-end" labelWidth={110}>
            <TransferEndDateField
              id="g04-edit-end"
              value={editForm.endDate}
              onChange={(endDate) => setEditForm({ ...editForm, endDate })}
              startDate={target.startDate}
            />
          </FormRow>
          <FormRow label="표시내용" htmlFor="g04-edit-memo" labelWidth={110}>
            <Input
              id="g04-edit-memo"
              maxLength={10}
              value={editForm.memo}
              onChange={(event) =>
                setEditForm({ ...editForm, memo: event.target.value })
              }
            />
          </FormRow>
        </div>
      </Modal>

      <ConfirmDialog
        open={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="자동이체 변경"
        messages={[
          "아래 내용으로 자동이체를 변경합니다.",
          "확인을 누르면 OTP 인증으로 이어집니다.",
        ]}
        confirmLabel="변경하기"
        items={[
          {
            label: "이체금액",
            value: formatAmount(Number(editForm.amount) || 0),
          },
          {
            label: "이체주기",
            value: CYCLE_LABEL[editForm.cycleMonths],
          },
          {
            label: "이체종료일",
            value: formatDate(editForm.endDate),
          },
          { label: "표시내용", value: editForm.memo },
        ]}
      />

      <OtpModal
        open={isOtpOpen}
        onClose={() => setIsOtpOpen(false)}
        onConfirm={handleOtpConfirm}
        guide="자동이체 변경을 위해 OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하세요."
        transactionType={OtpTransactionType.AUTO_TRANSFER}
        transactionData={{
          autoTransferId: Number(target.id),
          amount: Number(editForm.amount) || target.amount,
          endDate: editForm.endDate,
        }}
      />
    </>
  )
}
