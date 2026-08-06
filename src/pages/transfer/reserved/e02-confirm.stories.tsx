import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { ReservedTransferStep2 } from "@/pages/transfer/reserved/e02-confirm"
import { TRANSFER_STEPS } from "@/pages/transfer/transfer-steps"
import {
  MOCK_PAYEE_ACCOUNTS,
  MOCK_PAYEE_NAME,
  MOCK_TRANSFER_ACCOUNTS,
} from "@/entities/transfer"
import {
  formatAccountNo,
  formatAmount,
  formatDate,
  maskName,
} from "@/shared/lib/format"
import { WithAuthenticatedPage } from "../../../../.storybook/decorators/page-providers"

const FROM_ACCOUNT = MOCK_TRANSFER_ACCOUNTS[0]
const TO_ACCOUNT_NO = MOCK_PAYEE_ACCOUNTS[0].accountNo
const AMOUNT = 300_000
const SCHEDULED_DATE = "2026-07-30"

const meta = {
  title: "pages/E-02 예약이체 등록 · 정보확인 및 인증",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="transfer"
      breadcrumb={["이체", "예약이체", "예약이체 등록"]}
    >
      <ReservedTransferStep2
        steps={TRANSFER_STEPS}
        scheduledDate={
          <span className="tabular-nums">{formatDate(SCHEDULED_DATE)}</span>
        }
        fromAccount={
          <span className="tabular-nums">
            {FROM_ACCOUNT.alias} {formatAccountNo(FROM_ACCOUNT.accountNo)}
          </span>
        }
        toAccount={
          <span className="tabular-nums">{formatAccountNo(TO_ACCOUNT_NO)}</span>
        }
        payeeName={maskName(MOCK_PAYEE_NAME)}
        amount={formatAmount(AMOUNT, { suffix: false })}
        fee={formatAmount(0, { suffix: false })}
        payeeMemo="-"
        onPrev={() => {}}
        onSubmit={() => {}}
      />
    </PageShell>
  ),
} satisfies Meta<typeof ReservedTransferStep2>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
