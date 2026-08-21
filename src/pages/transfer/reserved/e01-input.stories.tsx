import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { ReservedTransferStep1 } from "@/pages/transfer/reserved/e01-input"
import type { ReservedTransferForm } from "@/pages/transfer/reserved-transfer-screen"
import { TRANSFER_STEPS } from "@/pages/transfer/transfer-steps"
import {
  MOCK_PAYEE_NAME,
  MOCK_TRANSFER_ACCOUNTS,
  MOCK_TRANSFER_LIMITS,
} from "@/entities/transfer"
import { daysBetween } from "@/shared/lib/date"
import { MOCK_TODAY } from "@/shared/config/mock-clock"
import { RESERVATION_MAX_RANGE_DAYS } from "@/shared/config/policy"
import { WithAuthenticatedPage } from "../../../../.storybook/decorators/page-providers"

const INITIAL_FORM: ReservedTransferForm = {
  fromAccount: MOCK_TRANSFER_ACCOUNTS[0].accountNo,
  password: "",
  toAccount: "",
  toConfirmed: false,
  amount: null,
  scheduledDate: "",
  payeeMemo: "",
  myMemo: "",
}

/** 화면 조립 컴포넌트(ReservedTransferScreen)가 하던 상태 관리를 스토리에서 재현한다. */
const ReservedTransferStep1Demo = () => {
  const [form, setForm] = React.useState<ReservedTransferForm>(INITIAL_FORM)

  const setField = <K extends keyof ReservedTransferForm>(
    key: K,
    value: ReservedTransferForm[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const perTransferLimit = MOCK_TRANSFER_LIMITS.perTransfer
  const dateSpan = form.scheduledDate
    ? daysBetween(MOCK_TODAY, form.scheduledDate)
    : null
  const dateValid =
    dateSpan != null && dateSpan >= 1 && dateSpan <= RESERVATION_MAX_RANGE_DAYS
  const canSubmit =
    form.password.length === 4 &&
    form.toConfirmed &&
    form.amount != null &&
    form.amount > 0 &&
    form.amount <= perTransferLimit &&
    dateValid

  return (
    <ReservedTransferStep1
      steps={TRANSFER_STEPS}
      accounts={MOCK_TRANSFER_ACCOUNTS}
      form={form}
      onChange={setField}
      today={MOCK_TODAY}
      perTransferLimit={perTransferLimit}
      payeeName={MOCK_PAYEE_NAME}
      canSubmit={canSubmit}
      onNext={() => {}}
    />
  )
}

const meta = {
  title: "pages/E-01 예약이체 등록 · 정보입력",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="transfer"
      breadcrumb={["이체", "예약이체", "예약이체 등록"]}
    >
      <ReservedTransferStep1Demo />
    </PageShell>
  ),
} satisfies Meta<typeof ReservedTransferStep1>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
