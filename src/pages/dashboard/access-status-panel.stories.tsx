import type { Meta, StoryObj } from "@storybook/react-vite"
import { AccessStatusPanel } from "@/pages/dashboard/access-status-panel"
import { MOCK_ACCESS_STATUS } from "@/entities/dashboard"

const meta = {
  title: "pages/dashboard/AccessStatusPanel",
  component: AccessStatusPanel,
  args: { status: MOCK_ACCESS_STATUS },
  parameters: { layout: "padded" },
} satisfies Meta<typeof AccessStatusPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
