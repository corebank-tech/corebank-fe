import type { Meta, StoryObj } from "@storybook/react-vite"
import { Panel, PanelHeader } from "@/shared/ui/panel"
import { LabelValueRow } from "@/shared/ui/label-value-row"
import { Button } from "@/shared/ui/button"
import { MOCK_ACCESS_STATUS } from "@/entities/dashboard"
import { formatDateTime } from "@/shared/lib/format"

const meta = {
  title: "shared/ui/Panel",
  parameters: { layout: "padded" },
} satisfies Meta<typeof Panel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="w-100">
      <Panel>
        <PanelHeader title="접속현황" />
        <div className="border-t border-border">
          <LabelValueRow
            label="최근 접속일시"
            value={formatDateTime(MOCK_ACCESS_STATUS.lastLogin)}
          />
          <LabelValueRow label="접속 IP" value={MOCK_ACCESS_STATUS.ip} />
        </div>
      </Panel>
    </div>
  ),
}

export const WithHeaderAction: Story = {
  render: () => (
    <div className="w-100">
      <Panel>
        <PanelHeader
          title="빠른메뉴"
          action={
            <Button size="sm" variant="ghost">
              더보기
            </Button>
          }
        />
      </Panel>
    </div>
  ),
}
