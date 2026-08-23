import type { Meta, StoryObj } from "@storybook/react-vite"
import { Panel, PanelHeader } from "@/shared/ui/panel"
import { LabelValueRow } from "@/shared/ui/label-value-row"
import { Button } from "@/shared/ui/button"

/** 접속현황 표시 예시값. 화면은 서버(GET /dashboard/login-status)에서 받는다. */
const SAMPLE_ACCESS = {
  lastLogin: "2026-07-23T08:57:34",
  ip: "203.245.11.87",
  lastTransaction: "2026-07-23T08:41:02",
}
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
            value={formatDateTime(SAMPLE_ACCESS.lastLogin)}
          />
          <LabelValueRow label="접속 IP" value={SAMPLE_ACCESS.ip} />
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
