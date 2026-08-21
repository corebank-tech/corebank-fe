import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { AutoTransferStep1 } from "@/pages/transfer/auto/g01-input"
import type { AutoTransferForm } from "@/pages/transfer/auto-transfer-screen"
import { TRANSFER_STEPS } from "@/pages/transfer/transfer-steps"
import {
  MOCK_PAYEE_NAME,
  MOCK_TRANSFER_ACCOUNTS,
  MOCK_TRANSFER_LIMITS,
} from "@/entities/transfer"
import { addMonths, daysBetween } from "@/shared/lib/date"
import { getToday } from "@/shared/config/clock"
import { AUTO_TRANSFER_START_MAX_RANGE_DAYS } from "@/shared/config/policy"
import { WithAuthenticatedPage } from "../../../../.storybook/decorators/page-providers"

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

/** 화면 조립 컴포넌트(AutoTransferScreen)가 하던 상태 관리를 스토리에서 재현한다. */
const AutoTransferStep1Demo = () => {
  const [form, setForm] = React.useState<AutoTransferForm>(INITIAL_FORM)

  const setField = <K extends keyof AutoTransferForm>(
    key: K,
    value: AutoTransferForm[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const perTransferLimit = MOCK_TRANSFER_LIMITS.perTransfer
  const startSpan = form.startDate
    ? daysBetween(getToday(), form.startDate)
    : null
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
  const canSubmit =
    form.password.length === 4 &&
    form.toConfirmed &&
    form.amount != null &&
    form.amount > 0 &&
    form.amount <= perTransferLimit &&
    startValid &&
    endValid

  return (
    <AutoTransferStep1
      steps={TRANSFER_STEPS}
      accounts={MOCK_TRANSFER_ACCOUNTS}
      form={form}
      onChange={setField}
      today={getToday()}
      perTransferLimit={perTransferLimit}
      payeeName={MOCK_PAYEE_NAME}
      canSubmit={canSubmit}
      onNext={() => {}}
    />
  )
}

const meta = {
  title: "pages/G-01 자동이체 등록 · 정보입력",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="transfer"
      breadcrumb={["이체", "자동이체", "자동이체 등록"]}
    >
      <AutoTransferStep1Demo />
    </PageShell>
  ),
} satisfies Meta<typeof AutoTransferStep1>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
