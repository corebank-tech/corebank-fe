import type { Meta, StoryObj } from "@storybook/react-vite"
import { LabelValueRow } from "@/shared/ui/label-value-row"

/** 접속현황 표시 예시값. 화면은 서버(GET /dashboard/login-status)에서 받는다. */
const SAMPLE_ACCESS = {
  lastLogin: "2026-07-23T08:57:34",
  ip: "203.245.11.87",
  lastTransaction: "2026-07-23T08:41:02",
}
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
        value={formatDateTime(SAMPLE_ACCESS.lastLogin)}
      />
    </div>
  ),
}

export const List: Story = {
  render: () => (
    <div className="flex w-100 flex-col border border-border">
      <LabelValueRow
        label="최근 접속일시"
        value={formatDateTime(SAMPLE_ACCESS.lastLogin)}
      />
      <LabelValueRow label="접속 IP" value={SAMPLE_ACCESS.ip} />
      <LabelValueRow
        label="최근 거래일시"
        value={formatDateTime(SAMPLE_ACCESS.lastTransaction)}
      />
    </div>
  ),
}
