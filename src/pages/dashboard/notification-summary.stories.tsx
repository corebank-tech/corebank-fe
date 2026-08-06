import type { Meta, StoryObj } from "@storybook/react-vite"
import { NotificationSummary } from "@/pages/dashboard/notification-summary"
import { MOCK_NOTIFICATIONS } from "@/entities/dashboard"

const meta = {
  title: "pages/dashboard/NotificationSummary",
  component: NotificationSummary,
  args: { items: MOCK_NOTIFICATIONS },
  parameters: { layout: "padded" },
} satisfies Meta<typeof NotificationSummary>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  args: { items: [] },
}
