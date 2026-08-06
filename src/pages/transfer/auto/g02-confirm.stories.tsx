import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { AutoTransferStep2 } from "@/pages/transfer/auto/g02-confirm"
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
const CYCLE_MONTHS = 1
const DAY_OF_MONTH = 25

const meta = {
  title: "pages/G-02 자동이체 등록 · 정보확인 및 인증",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="transfer"
      breadcrumb={["이체", "자동이체", "자동이체 등록"]}
    >
      <AutoTransferStep2
        steps={TRANSFER_STEPS}
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
        cycle={`${CYCLE_MONTHS}개월`}
        dayOfMonth={`매월 ${DAY_OF_MONTH}일`}
        period={
          <span className="tabular-nums">
            {formatDate(START_DATE)} ~ {formatDate(END_DATE)}
          </span>
        }
        payeeMemo="-"
        onPrev={() => {}}
        onSubmit={() => {}}
      />
    </PageShell>
  ),
} satisfies Meta<typeof AutoTransferStep2>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
