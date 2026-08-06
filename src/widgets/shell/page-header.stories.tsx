import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageHeader } from "@/widgets/shell/page-header"

const meta = {
  title: "widgets/shell/PageHeader",
  component: PageHeader,
  parameters: { layout: "padded" },
  args: { title: "예약이체 조회/취소" },
} satisfies Meta<typeof PageHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const TextScaleActive: Story = {
  args: { textScaleActive: true },
}
