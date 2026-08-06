import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { InstantTransferStep1 } from "@/pages/transfer/instant-transfer/d01-input"
import type { InstantTransferForm } from "@/pages/transfer/instant-transfer-screen"
import { TRANSFER_STEPS } from "@/pages/transfer/transfer-steps"
import {
  MOCK_FREQUENT_TRANSFER_ACCOUNTS,
  MOCK_RECENT_TRANSFER_ACCOUNTS,
  MOCK_TRANSFER_ACCOUNTS,
  MOCK_TRANSFER_LIMITS,
  lookupPayeeAccount,
} from "@/entities/transfer"
import { WithAuthenticatedPage } from "../../../../.storybook/decorators/page-providers"

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

/** 화면 조립 컴포넌트(InstantTransferScreen)가 하던 상태 관리를 스토리에서 재현한다. */
const InstantTransferStep1Demo = () => {
  const [form, setForm] = React.useState<InstantTransferForm>(INITIAL_FORM)

  const setField = <K extends keyof InstantTransferForm>(
    key: K,
    value: InstantTransferForm[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const dailyRemaining =
    MOCK_TRANSFER_LIMITS.perDay - MOCK_TRANSFER_LIMITS.usedToday
  const perTransferLimit = MOCK_TRANSFER_LIMITS.perTransfer
  const canSubmit =
    form.password.length === 4 &&
    form.toConfirmed &&
    form.amount != null &&
    form.amount > 0 &&
    form.amount <= Math.min(perTransferLimit, dailyRemaining)

  const resolveToAccount = (accountNo: string) => {
    const looked = lookupPayeeAccount(accountNo)
    setForm((f) => ({
      ...f,
      toAccount: accountNo,
      toConfirmed: looked.ok,
      payeeName: looked.ok ? (looked.payeeName ?? "") : "",
      executionFails: looked.executionFails ?? false,
      toAccountError: looked.ok ? null : (looked.error ?? null),
    }))
  }

  return (
    <InstantTransferStep1
      steps={TRANSFER_STEPS}
      accounts={MOCK_TRANSFER_ACCOUNTS}
      form={form}
      onChange={setField}
      perTransferLimit={perTransferLimit}
      dailyRemaining={dailyRemaining}
      canSubmit={canSubmit}
      onNext={() => {}}
      onConfirmAccount={() => resolveToAccount(form.toAccount)}
      onSelectQuickAccount={resolveToAccount}
      frequentAccounts={MOCK_FREQUENT_TRANSFER_ACCOUNTS}
      recentAccounts={MOCK_RECENT_TRANSFER_ACCOUNTS}
    />
  )
}

const meta = {
  title: "pages/D-01 즉시이체 · 정보입력",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="transfer"
      breadcrumb={["이체", "즉시이체", "당행이체"]}
    >
      <InstantTransferStep1Demo />
    </PageShell>
  ),
} satisfies Meta<typeof InstantTransferStep1>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
