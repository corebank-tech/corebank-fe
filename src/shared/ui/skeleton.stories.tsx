import type { Meta, StoryObj } from "@storybook/react-vite"
import { Skeleton } from "@/shared/ui/skeleton"

const meta = {
  title: "shared/ui/Skeleton",
  component: Skeleton,
  args: { className: "h-4 w-40" },
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const TableRow: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  ),
}
