import type { Meta, StoryObj } from "@storybook/react-vite"
import { Chip } from "@/shared/ui/chip"

const PLACEHOLDER_LABEL = "코어뱅크"

const meta = {
  title: "shared/ui/Chip/Sizes",
  component: Chip,
  args: { children: PLACEHOLDER_LABEL, tone: "default" },
  parameters: {
    docs: {
      description: {
        component:
          "칩 높이(size) 축. tone은 default 하나로 고정해 크기 차이만 비교한다.",
      },
    },
  },
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "화면별로 실제 쓰이던 높이·패딩 조합(h-7/h-8/h-9).",
    },
  },
} satisfies Meta<typeof Chip>

export default meta
type Story = StoryObj<typeof meta>

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "sm/md/lg 세 크기를 나란히 비교한다. 기간 프리셋은 기본적으로 sm/md, 강조가 필요한 빠른 금액 칩은 lg를 쓴다.",
      },
    },
  },
  render: (args) => (
    <div className="flex items-center gap-2">
      <Chip {...args} size="sm" />
      <Chip {...args} size="md" />
      <Chip {...args} size="lg" />
    </div>
  ),
}
