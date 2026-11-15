import type { Meta, StoryObj } from "@storybook/react-vite"
import { FdsHeldTransferReview } from "@/pages/admin/fds-held-transfer-review"
import { FDS_ADMIN_SCENARIOS } from "@/mocks/fixtures/fds-admin"

const meta = {
  title: "pages/admin/FDS 보류 사건 처리 장면",
  component: FdsHeldTransferReview,
  parameters: { layout: "padded" },
  args: { detail: FDS_ADMIN_SCENARIOS.investigationCompleted },
} satisfies Meta<typeof FdsHeldTransferReview>

export default meta
type Story = StoryObj<typeof meta>

export const InvestigationPending: Story = {
  args: { detail: FDS_ADMIN_SCENARIOS.investigationPending },
}
export const InvestigationRunning: Story = {
  args: { detail: FDS_ADMIN_SCENARIOS.investigationRunning },
}
export const InvestigationCompleted: Story = {}
export const InvestigationFailed: Story = {
  args: { detail: FDS_ADMIN_SCENARIOS.investigationFailed },
}
export const RiskMatch: Story = {
  args: { detail: FDS_ADMIN_SCENARIOS.riskMatch },
}
export const RiskNoMatch: Story = {
  args: { detail: FDS_ADMIN_SCENARIOS.riskNoMatch },
}
export const RiskUnavailable: Story = {
  args: { detail: FDS_ADMIN_SCENARIOS.riskUnavailable },
}
export const AdminActionPending: Story = {
  args: { detail: FDS_ADMIN_SCENARIOS.actionPending },
}
export const AdminActionCompleted: Story = {
  args: { detail: FDS_ADMIN_SCENARIOS.actionCompleted },
}
export const AdminActionFailed: Story = {
  args: { detail: FDS_ADMIN_SCENARIOS.actionFailed },
}
export const AdminActionConflict: Story = {
  args: { detail: FDS_ADMIN_SCENARIOS.actionConflict },
}
export const RecoveryRequired: Story = {
  args: { detail: FDS_ADMIN_SCENARIOS.actionRecovery },
}
