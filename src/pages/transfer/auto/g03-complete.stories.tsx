import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { AutoTransferStep3 } from "@/pages/transfer/auto/g03-complete"
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
const AMOUNT = 200_000
const START_DATE = "2026-07-30"
const END_DATE = "2027-07-30"
const NEXT_EXEC_DATE = "2026-08-25"
const CYCLE_MONTHS = 1
const DAY_OF_MONTH = 25

const meta = {
  title: "pages/G-03 자동이체 등록 · 완료",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="transfer"
      breadcrumb={["이체", "자동이체", "자동이체 등록"]}
    >
      <AutoTransferStep3
        steps={TRANSFER_STEPS}
        row={{
          fromAccount: (
            <span className="tabular-nums">
              {FROM_ACCOUNT.alias} {formatAccountNo(FROM_ACCOUNT.accountNo)}
            </span>
          ),
          toAccount: formatAccountNo(TO_ACCOUNT_NO),
          payeeName: maskName(MOCK_PAYEE_NAME),
          amount: formatAmount(AMOUNT, { suffix: false }),
          period: `${formatDate(START_DATE)} ~ ${formatDate(END_DATE)}`,
          cycle: `${CYCLE_MONTHS}개월`,
          dayOfMonth: `매월 ${DAY_OF_MONTH}일`,
          nextExecDate: formatDate(NEXT_EXEC_DATE),
        }}
        highlightAmount={formatAmount(AMOUNT)}
        onViewAutoTransfers={() => {}}
      />
    </PageShell>
  ),
} satisfies Meta<typeof AutoTransferStep3>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
