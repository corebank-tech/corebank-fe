import type { Meta, StoryObj } from "@storybook/react-vite"
import { ConfirmSummary } from "@/shared/ui/confirm-summary"
import { MOCK_PAYEE_NAME, MOCK_PAYEE_ACCOUNTS } from "@/entities/transfer"
import { formatAccountNo, formatAmount } from "@/shared/lib/format"

const DEMO_PAYEE_ACCOUNT_NO = MOCK_PAYEE_ACCOUNTS[0].accountNo

const meta = {
  title: "shared/ui/ConfirmSummary",
  component: ConfirmSummary,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ConfirmSummary>

export default meta
type Story = StoryObj<typeof meta>

export const TransferReview: Story = {
  args: {
    columns: [
      { label: "받는분", value: MOCK_PAYEE_NAME },
      {
        label: "받는분 계좌번호",
        value: formatAccountNo(DEMO_PAYEE_ACCOUNT_NO),
      },
      {
        label: "이체금액(원)",
        value: formatAmount(500_000, { suffix: false }),
        emphasis: true,
      },
    ],
  },
}
