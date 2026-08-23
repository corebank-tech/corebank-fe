import type { Meta, StoryObj } from "@storybook/react-vite"
import { AccessStatusPanel } from "@/pages/dashboard/access-status-panel"

const meta = {
  title: "pages/dashboard/AccessStatusPanel",
  component: AccessStatusPanel,
  args: {
    status: {
      previousLoginAt: "2026-07-23T08:57:34",
      currentLoginIp: "203.245.11.87",
      lastTransactionAt: "2026-07-23T08:41:02",
    },
  },
  parameters: { layout: "padded" },
} satisfies Meta<typeof AccessStatusPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
