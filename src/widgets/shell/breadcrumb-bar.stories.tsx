import type { Meta, StoryObj } from "@storybook/react-vite"
import { BreadcrumbBar } from "@/widgets/shell/breadcrumb-bar"

const meta = {
  title: "widgets/shell/BreadcrumbBar",
  component: BreadcrumbBar,
  parameters: { layout: "padded" },
} satisfies Meta<typeof BreadcrumbBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { trail: ["개인", "이체", "예약이체", "예약이체 등록"] },
}

export const ShallowTrail: Story = {
  args: { trail: ["개인", "조회"] },
}
