import type { Meta, StoryObj } from "@storybook/react-vite"
import { EmptyState } from "@/shared/ui/empty-state"
import { Button } from "@/shared/ui/button"

const meta = {
  title: "shared/ui/EmptyState",
  component: EmptyState,
  args: { message: "조회 결과가 없습니다." },
  parameters: { layout: "padded" },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithDescription: Story = {
  args: {
    message: "등록된 자동이체가 없습니다.",
    description: "자동이체를 등록하면 이 목록에 표시됩니다.",
  },
}

export const WithAction: Story = {
  args: {
    message: "보유한 출금계좌가 없습니다.",
    description: "출금계좌를 등록하면 이체 시 선택할 수 있습니다.",
    action: <Button size="sm">출금계좌 등록</Button>,
  },
}
