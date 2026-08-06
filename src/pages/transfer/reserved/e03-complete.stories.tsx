import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { ReservedTransferStep3 } from "@/pages/transfer/reserved/e03-complete"
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
  title: "pages/E-03 예약이체 등록 · 완료",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="transfer"
      breadcrumb={["이체", "예약이체", "예약이체 등록"]}
    >
      <ReservedTransferStep3
        steps={TRANSFER_STEPS}
        row={{
          scheduledDate: formatDate(SCHEDULED_DATE),
          fromAccount: (
            <span className="tabular-nums">
              {FROM_ACCOUNT.alias} {formatAccountNo(FROM_ACCOUNT.accountNo)}
            </span>
          ),
          toAccount: formatAccountNo(TO_ACCOUNT_NO),
          payeeName: maskName(MOCK_PAYEE_NAME),
          amount: formatAmount(AMOUNT, { suffix: false }),
          fee: formatAmount(0, { suffix: false }),
          payeeMemo: "-",
          myMemo: "-",
        }}
        highlightAmount={formatAmount(AMOUNT)}
        onViewReservations={() => {}}
      />
    </PageShell>
  ),
} satisfies Meta<typeof ReservedTransferStep3>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
