import type { Meta, StoryObj } from "@storybook/react-vite"
import { Checkbox } from "@/shared/ui/checkbox"

const meta = {
  title: "shared/ui/Checkbox/Checked",
  component: Checkbox,
  args: { label: "전체 약관에 동의합니다", disabled: false },
  parameters: {
    docs: {
      description: {
        component:
          "체크 여부 축. disabled는 false 하나로 고정해 체크 상태 차이만 비교한다.",
      },
    },
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Unchecked: Story = {
  parameters: {
    docs: {
      description: { story: "선택되지 않은 기본 상태." },
    },
  },
}

export const Checked: Story = {
  args: { defaultChecked: true },
  parameters: {
    docs: {
      description: {
        story: "선택된 상태. 체크 아이콘과 primary 색으로 표시한다.",
      },
    },
  },
}
