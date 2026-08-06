import type { Meta, StoryObj } from "@storybook/react-vite"
import { Button } from "@/shared/ui/button"

const PLACEHOLDER_LABEL = "코어뱅크"

const meta = {
  title: "shared/ui/Button/Sizes",
  component: Button,
  args: { children: PLACEHOLDER_LABEL, variant: "primary" },
  parameters: {
    docs: {
      description: {
        component:
          "버튼 높이(size) 축. variant는 primary 하나로 고정해 크기 차이만 비교한다.",
      },
    },
  },
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "버튼 높이. size 키는 반응형 클래스 금지 규칙의 예외다.",
    },
    fullWidth: {
      control: "boolean",
      description: "너비를 부모 컨테이너에 꽉 채운다.",
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "sm/md/lg 세 크기를 나란히 비교한다. 화면 밀도(표 안 버튼은 sm, 스텝 폼 하단은 lg)에 맞춰 고른다.",
      },
    },
  },
  render: (args) => (
    <div className="flex items-center gap-2">
      <Button {...args} size="sm" />
      <Button {...args} size="md" />
      <Button {...args} size="lg" />
    </div>
  ),
}

export const FullWidth: Story = {
  args: { fullWidth: true },
  parameters: {
    docs: {
      description: {
        story:
          "부모 컨테이너 너비에 꽉 채운다. 모달 하단 액션 등 폭이 고정된 컨테이너에서 쓴다.",
      },
    },
  },
  render: (args) => (
    <div className="w-80">
      <Button {...args} />
    </div>
  ),
}
