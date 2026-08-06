import * as React from "react"
import { Button } from "@/shared/ui/button"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { StepLayout } from "@/shared/ui/step-layout"
import {
  WithdrawAccountField,
  AccountPasswordField,
  AccountNumberField,
  AmountField,
  MemoField,
  TransferDateField,
} from "@/widgets/transfer"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { maskName } from "@/shared/lib/format"
import type { AccountOption } from "@/shared/types/account"
import type { ReservedTransferForm } from "@/pages/transfer/reserved-transfer-screen"

type ReservedTransferStep1Props = {
  steps: string[]
  accounts: AccountOption[]
  form: ReservedTransferForm
  onChange: <K extends keyof ReservedTransferForm>(
    key: K,
    value: ReservedTransferForm[K],
  ) => void
  today: string
  perTransferLimit: number
  payeeName: string
  duplicate: boolean
  canSubmit: boolean
  onNext: () => void
}

/** E-01 예약이체 등록 1단계 · 정보입력 */
export const ReservedTransferStep1 = ({
  steps,
  accounts,
  form,
  onChange,
  today,
  perTransferLimit,
  payeeName,
  duplicate,
  canSubmit,
  onNext,
}: ReservedTransferStep1Props) => {
  return (
    <>
      <StepLayout
        steps={steps}
        currentStep={1}
        title="예약이체"
        notice={[
          "당행 계좌 간 이체만 가능하며, 지정한 예정일자에 실행됩니다.",
          "이체 예정시각은 별도로 선택하지 않으며, 배치 실행 시각에 일괄 처리됩니다.",
          "이체 예정일자는 내일부터 1년 이내에서만 지정할 수 있습니다.",
        ]}
        footer={
          <Button
            variant="primary"
            size="lg"
            className="min-w-40"
            disabled={!canSubmit}
            onClick={onNext}
          >
            다음
          </Button>
        }
      >
        <FormSection title="출금정보">
          <div>
            <FormRow label="출금계좌" required htmlFor="rt-from">
              <WithdrawAccountField
                id="rt-from"
                options={accounts}
                value={form.fromAccount}
                onChange={(v) => onChange("fromAccount", v)}
              />
            </FormRow>
            <FormRow label="계좌비밀번호" required htmlFor="rt-pw">
              <AccountPasswordField
                id="rt-pw"
                value={form.password}
                onChange={(v) => onChange("password", v)}
              />
            </FormRow>
          </div>
        </FormSection>

        <FormSection title="입금정보">
          <div>
            <FormRow label="입금계좌번호" required htmlFor="rt-to">
              <AccountNumberField
                id="rt-to"
                value={form.toAccount}
                onChange={(v) => {
                  onChange("toAccount", v)
                  onChange("toConfirmed", false)
                }}
                onConfirm={() =>
                  onChange("toConfirmed", form.toAccount.length >= 10)
                }
                confirmed={form.toConfirmed}
                holderName={maskName(payeeName)}
              />
            </FormRow>
            <FormRow label="이체금액" required htmlFor="rt-amount">
              <div className="flex w-full flex-col gap-1">
                <AmountField
                  id="rt-amount"
                  value={form.amount}
                  onChange={(v) => onChange("amount", v)}
                  perTransferLimit={perTransferLimit}
                  dailyRemaining={perTransferLimit}
                  showDailyLimit={false}
                />
                <p className="text-2xs text-ink-muted">
                  ※ 1회 이체한도 범위 내에서 1원 이상의 정수만 입력할 수 있으며,
                  0원과 소수는 입력할 수 없습니다. 1일 이체한도는 실행 시점에
                  검증됩니다.
                </p>
              </div>
            </FormRow>
            <FormRow label="이체 예정일자" required htmlFor="rt-date">
              <TransferDateField
                id="rt-date"
                value={form.scheduledDate}
                onChange={(v) => onChange("scheduledDate", v)}
                today={today}
                rangeLabel="이체 예정일자"
              />
            </FormRow>
            <FormRow label="받는분 통장 표시내용" htmlFor="rt-memo-payee">
              <div className="flex w-full flex-col gap-1">
                <MemoField
                  id="rt-memo-payee"
                  value={form.payeeMemo}
                  onChange={(v) => onChange("payeeMemo", v)}
                  placeholder="받는분 통장에 표시 (7자 이내)"
                />
                <p className="text-2xs text-ink-muted">
                  ※ 미입력 시 받는 분 표시내용은 본인 예금주명, 내 표시내용은
                  상대방 예금주명이 기본 적용됩니다.
                </p>
              </div>
            </FormRow>
            <FormRow label="내 통장 표시내용" htmlFor="rt-memo-mine">
              <MemoField
                id="rt-memo-mine"
                value={form.myMemo}
                onChange={(v) => onChange("myMemo", v)}
                placeholder="내 통장에 표시 (7자 이내)"
              />
            </FormRow>
          </div>
        </FormSection>

        {duplicate && (
          <p role="alert" className="text-base font-bold text-danger">
            출금계좌·입금계좌·이체금액·이체예정일자가 모두 같은 예약이체가 이미
            대기 중입니다. 내용을 변경한 뒤 다시 등록하세요.
          </p>
        )}
      </StepLayout>

      <NoticeBoxFooter
        className="mt-8"
        items={[
          "예약이체는 당행 계좌 간, 지정한 미래 일자에 1회 실행되는 이체입니다. 반복 실행은 자동이체에서 등록하세요.",
          "출금계좌와 입금계좌가 동일하면 이체할 수 없습니다.",
          "잔액과 1일 이체한도는 등록 시점이 아닌 실행 시점에 검증됩니다. 실행일 전까지 잔액을 확보해 두세요.",
          "이체 실행 전 계좌비밀번호와 OTP 인증이 필요합니다.",
        ]}
      />
    </>
  )
}
