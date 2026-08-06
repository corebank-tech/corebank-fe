import type { Meta, StoryObj } from "@storybook/react-vite"
import { LabelValueRow } from "@/shared/ui/label-value-row"
import { MOCK_ACCESS_STATUS } from "@/entities/dashboard"
import { formatDateTime } from "@/shared/lib/format"

const meta = {
  title: "shared/ui/LabelValueRow",
  parameters: { layout: "padded" },
} satisfies Meta<typeof LabelValueRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="w-100">
      <LabelValueRow
        label="최근 접속일시"
        value={formatDateTime(MOCK_ACCESS_STATUS.lastLogin)}
      />
    </div>
  ),
}

export const List: Story = {
  render: () => (
    <div className="flex w-100 flex-col border border-border">
      <LabelValueRow
        label="최근 접속일시"
        value={formatDateTime(MOCK_ACCESS_STATUS.lastLogin)}
      />
      <LabelValueRow label="접속 IP" value={MOCK_ACCESS_STATUS.ip} />
      <LabelValueRow
        label="최근 거래일시"
        value={formatDateTime(MOCK_ACCESS_STATUS.lastTransaction)}
      />
    </div>
  ),
}
