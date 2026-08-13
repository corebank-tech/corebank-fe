import * as React from "react"
import { OtpModal } from "@/entities/auth"
import {
  AUTO_TRANSFER_CYCLE_LABEL as CYCLE_LABEL,
  type AutoTransferRow,
  type TransferCycle,
} from "@/entities/transfer"
import { RadioRowField } from "@/widgets/query"
import { TransferEndDateField } from "@/widgets/transfer"
import { addMonths, daysBetween, parseISO, toISO } from "@/shared/lib/date"
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

/**
 * REQ-AUTO-010: 이체주기를 변경하면 다음 실행 예정일을 직전 실행 예정일 기준으로
 * 다시 계산한다. 대상 월에 이체지정일이 없으면 그 달의 말일로 보정한다(POL-034).
 */
const recomputeNextExecDate = (
  previousNextExecDate: string,
  cycleMonths: TransferCycle,
  dayOfMonth: number,
): string => {
  const previousDate = parseISO(previousNextExecDate)
  const totalMonthIndex = previousDate.getMonth() + cycleMonths
  const year = previousDate.getFullYear() + Math.floor(totalMonthIndex / 12)
  const month = ((totalMonthIndex % 12) + 12) % 12
  const lastDay = new Date(year, month + 1, 0).getDate()
  return toISO(new Date(year, month, Math.min(dayOfMonth, lastDay)))
}

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
  onSave: (updatedRow: AutoTransferRow) => void
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

  const handleConfirm = () => {
    setIsConfirmOpen(false)
    setIsOtpOpen(true)
  }

  const handleOtpConfirm = () => {
    const isCycleChanged = editForm.cycleMonths !== target.cycleMonths
    const nextExecDate =
      isCycleChanged && target.nextExecDate != null
        ? recomputeNextExecDate(
            target.nextExecDate,
            editForm.cycleMonths,
            target.dayOfMonth,
          )
        : target.nextExecDate

    onSave({
      ...target,
      amount: Number(editForm.amount) || target.amount,
      cycleMonths: editForm.cycleMonths,
      endDate: editForm.endDate,
      memo: editForm.memo,
      nextExecDate,
    })
    setIsOtpOpen(false)
    onClose()
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
      />
    </>
  )
}
