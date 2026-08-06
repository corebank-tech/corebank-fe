import type { Meta, StoryObj } from "@storybook/react-vite"
import { CollapsibleSection } from "@/shared/ui/collapsible-section"
import { LabelValueRow } from "@/shared/ui/label-value-row"
import { MOCK_OVERVIEW_ACCOUNTS } from "@/entities/account"
import { formatAccountNo, formatDate } from "@/shared/lib/format"

const DEMO_ACCOUNT = MOCK_OVERVIEW_ACCOUNTS[0]

const meta = {
  title: "shared/ui/CollapsibleSection",
  parameters: { layout: "padded" },
} satisfies Meta<typeof CollapsibleSection>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {
  render: () => (
    <div className="w-160">
      <CollapsibleSection title="계좌정보">
        <LabelValueRow
          label="계좌번호"
          value={formatAccountNo(DEMO_ACCOUNT.accountNo)}
        />
        <LabelValueRow
          label="개설일"
          value={formatDate(DEMO_ACCOUNT.openedDate)}
        />
      </CollapsibleSection>
    </div>
  ),
}

export const Closed: Story = {
  render: () => (
    <div className="w-160">
      <CollapsibleSection title="계좌정보" defaultOpen={false}>
        <LabelValueRow
          label="계좌번호"
          value={formatAccountNo(DEMO_ACCOUNT.accountNo)}
        />
      </CollapsibleSection>
    </div>
  ),
}
