import type { Meta, StoryObj } from "@storybook/react-vite"
import { X } from "lucide-react"
import { IconButton } from "@/shared/ui/icon-button"

const meta = {
  title: "shared/ui/IconButton/Size",
  component: IconButton,
  args: {
    "aria-label": "닫기",
    className: "border border-border-strong text-ink-muted hover:bg-surface",
    children: <X className="h-4 w-4" aria-hidden="true" />,
    shape: "square",
  },
  parameters: {
    docs: {
      description: {
        component:
          "아이콘 버튼의 크기(size) 축. shape는 square 하나로 고정해 크기 차이만 비교한다.",
      },
    },
  },
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "아이콘 버튼의 정사각 한 변 길이(h-7/h-9/h-10).",
    },
  },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "sm/md/lg 세 크기를 나란히 비교한다. 표 행·툴바처럼 조밀한 곳은 sm, 모달 닫기처럼 단독으로 놓이는 곳은 md/lg를 쓴다.",
      },
    },
  },
  render: (args) => (
    <div className="flex items-center gap-2">
      <IconButton {...args} size="sm" />
      <IconButton {...args} size="md" />
      <IconButton {...args} size="lg" />
    </div>
  ),
}
