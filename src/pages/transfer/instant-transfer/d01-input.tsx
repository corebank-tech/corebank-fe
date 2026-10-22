import { Button } from "@/shared/ui/button"
import { Chip } from "@/shared/ui/chip"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { StepLayout } from "@/shared/ui/step-layout"
import {
  WithdrawAccountField,
  AccountPasswordField,
  AccountNumberField,
  AmountField,
  MemoField,
} from "@/widgets/transfer"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { Select } from "@/shared/ui/select"
import { formatAccountNo, maskName } from "@/shared/lib/format"
import type { AccountOption } from "@/shared/types/account"
import type {
  FrequentTransferAccount,
  RecentTransferAccount,
} from "@/entities/transfer"
import type { InstantTransferForm } from "@/pages/transfer/instant-transfer-screen"

/** 입금은행 선택지. `bankCode` 가 `null` 이면 당행이다. */
export type BankOption = { bankCode: string | null; bankName: string }

/** `<select>` 값은 문자열이라 당행(`null`)을 빈 문자열로 싣는다. */
const OWN_BANK_VALUE = ""

type InstantTransferStep1Props = {
  steps: string[]
  accounts: AccountOption[]
  form: InstantTransferForm
  onChange: <K extends keyof InstantTransferForm>(
    key: K,
    value: InstantTransferForm[K],
  ) => void
  perTransferLimit: number
  dailyRemaining: number
  /** 한도를 아직 모르는 상태. 한도 안내와 초과 경고를 감춘다(REQ-TRSF-010). */
  isLimitUnavailable?: boolean
  canSubmit: boolean
  /** 한도·계좌 조회가 끝나지 않았거나 실패했을 때 보여줄 안내. */
  notice?: string | null
  onNext: () => void
  /** FE B-8: 당행을 맨 앞에 둔 입금은행 선택지. */
  bankOptions: BankOption[]
  /** 은행 목록을 못 받았을 때의 안내. 당행 이체는 그대로 된다. */
  bankNotice?: string | null
  onChangeBank: (bankCode: string | null) => void
  /** 입력된 입금계좌번호로 예금주를 조회한다(REQ-TRSF-004·007·030). */
  onConfirmAccount: () => void
  /** 자주 쓰는 계좌 · 최근 이체계좌 선택 시 입금계좌번호를 채우고 즉시 조회한다. */
  onSelectQuickAccount: (accountNo: string) => void
  frequentAccounts: FrequentTransferAccount[]
  recentAccounts: RecentTransferAccount[]
}

/** D-01 즉시이체 1단계 · 정보입력 */
export const InstantTransferStep1 = ({
  steps,
  accounts,
  form,
  onChange,
  notice,
  perTransferLimit,
  dailyRemaining,
  isLimitUnavailable = false,
  canSubmit,
  onNext,
  bankOptions,
  bankNotice,
  onChangeBank,
  onConfirmAccount,
  onSelectQuickAccount,
  frequentAccounts,
  recentAccounts,
}: InstantTransferStep1Props) => {
  const selected = accounts.find((a) => a.accountNo === form.fromAccount)

  return (
    <>
      <StepLayout
        steps={steps}
        currentStep={1}
        title="즉시이체"
        notice={[
          "당행 계좌 간 이체만 가능하며, 입금은 즉시 반영됩니다.",
          "입금계좌번호를 정확히 입력한 뒤 계좌확인으로 예금주명을 확인하세요.",
          "이체한도를 초과하는 금액은 이체할 수 없습니다.",
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
        {notice != null && (
          <p role="alert" className="mb-3 text-base font-bold text-danger">
            {notice}
          </p>
        )}
        <FormSection title="출금정보">
          <div>
            <FormRow label="출금계좌" required htmlFor="it-from">
              <WithdrawAccountField
                id="it-from"
                options={accounts}
                value={form.fromAccount}
                onChange={(v) => onChange("fromAccount", v)}
              />
            </FormRow>
            <FormRow label="계좌비밀번호" required htmlFor="it-pw">
              <AccountPasswordField
                id="it-pw"
                value={form.password}
                onChange={(v) => onChange("password", v)}
              />
            </FormRow>
          </div>
        </FormSection>

        <FormSection title="입금정보">
          <div>
            <FormRow label="입금은행" required htmlFor="it-bank">
              <div className="flex w-full flex-col gap-1">
                <div className="max-w-xs">
                  <Select
                    id="it-bank"
                    value={form.payeeBankCode ?? OWN_BANK_VALUE}
                    onChange={(e) =>
                      onChangeBank(
                        e.target.value === OWN_BANK_VALUE
                          ? null
                          : e.target.value,
                      )
                    }
                  >
                    {bankOptions.map((bank) => (
                      <option
                        key={bank.bankCode ?? OWN_BANK_VALUE}
                        value={bank.bankCode ?? OWN_BANK_VALUE}
                      >
                        {bank.bankName}
                      </option>
                    ))}
                  </Select>
                </div>
                {bankNotice != null && (
                  <p role="alert" className="text-xs font-bold text-danger">
                    {bankNotice}
                  </p>
                )}
              </div>
            </FormRow>
            <FormRow label="입금계좌번호" required htmlFor="it-to">
              <div className="flex w-full flex-col gap-2">
                <AccountNumberField
                  id="it-to"
                  value={form.toAccount}
                  onChange={(v) => {
                    onChange("toAccount", v)
                    onChange("toConfirmed", false)
                    onChange("payeeName", "")
                    onChange("toAccountError", null)
                  }}
                  onConfirm={onConfirmAccount}
                  confirmed={form.toConfirmed}
                  holderName={
                    form.payeeName ? maskName(form.payeeName) : undefined
                  }
                  error={form.toAccountError}
                />
                {(frequentAccounts.length > 0 || recentAccounts.length > 0) && (
                  <div className="flex flex-col gap-1.5">
                    {frequentAccounts.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="shrink-0 text-2xs text-ink-faint">
                          자주 쓰는 계좌
                        </span>
                        {frequentAccounts.map((a) => (
                          <Chip
                            key={a.accountNo}
                            size="sm"
                            onClick={() => onSelectQuickAccount(a.accountNo)}
                            className="bg-white"
                          >
                            {a.nickname ?? maskName(a.payeeName)}{" "}
                            {formatAccountNo(a.accountNo)}
                          </Chip>
                        ))}
                      </div>
                    )}
                    {recentAccounts.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="shrink-0 text-2xs text-ink-faint">
                          최근 이체계좌
                        </span>
                        {recentAccounts.slice(0, 5).map((a) => (
                          <Chip
                            key={a.accountNo}
                            size="sm"
                            tone="muted"
                            onClick={() => onSelectQuickAccount(a.accountNo)}
                            className="border-border"
                          >
                            {maskName(a.payeeName)}{" "}
                            {formatAccountNo(a.accountNo)}
                          </Chip>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </FormRow>
            <FormRow label="이체금액" required htmlFor="it-amount">
              <div className="flex w-full flex-col gap-1">
                <AmountField
                  id="it-amount"
                  value={form.amount}
                  onChange={(v) => onChange("amount", v)}
                  perTransferLimit={perTransferLimit}
                  dailyRemaining={dailyRemaining}
                  isLimitUnavailable={isLimitUnavailable}
                  fullAmount={selected?.withdrawable}
                />
                <p className="text-2xs text-ink-muted">
                  ※ 1회 최대 이체한도 범위 내에서 1원 이상의 정수만 입력할 수
                  있으며, 0원과 소수는 입력할 수 없습니다.
                </p>
              </div>
            </FormRow>
            <FormRow label="받는 분 통장 표시내용" htmlFor="it-memo-payee">
              <div className="flex w-full flex-col gap-1">
                <MemoField
                  id="it-memo-payee"
                  value={form.payeeMemo}
                  onChange={(v) => onChange("payeeMemo", v)}
                  placeholder="받는 분 통장에 표시 (한글 10자 이내)"
                />
                <p className="text-2xs text-ink-muted">
                  ※ 미입력 시 받는 분 표시내용은 본인 예금주명, 내 표시내용은
                  상대방 예금주명이 기본 적용됩니다.
                </p>
              </div>
            </FormRow>
            <FormRow label="내 통장 표시내용" htmlFor="it-memo-mine">
              <MemoField
                id="it-memo-mine"
                value={form.myMemo}
                onChange={(v) => onChange("myMemo", v)}
                placeholder="내 통장에 표시 (한글 10자 이내)"
              />
            </FormRow>
          </div>
        </FormSection>
      </StepLayout>

      <NoticeBoxFooter
        className="mt-8"
        items={[
          "이체는 당행 계좌 간 원화 이체만 제공하며, 타행이체는 제공하지 않습니다.",
          "출금계좌와 입금계좌가 동일하면 이체할 수 없습니다.",
          "정기예금 계좌는 입금계좌로 지정할 수 없으며, 입출금계좌와 정기적금계좌만 입금계좌로 지정할 수 있습니다.",
          "당행이체는 수수료가 발생하지 않습니다.",
          "이체 실행 전 계좌비밀번호와 OTP 인증이 필요합니다.",
        ]}
      />
    </>
  )
}
