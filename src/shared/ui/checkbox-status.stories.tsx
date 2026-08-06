import type { Meta, StoryObj } from "@storybook/react-vite"
import { Checkbox } from "@/shared/ui/checkbox"

const meta = {
  title: "shared/ui/Checkbox/Status",
  component: Checkbox,
  args: { label: "전체 약관에 동의합니다" },
  parameters: {
    docs: {
      description: {
        component:
          "상호작용 상태 축. checked는 false 하나로 고정해 활성/비활성 차이만 비교한다.",
      },
    },
  },
  argTypes: {
    disabled: {
      control: "boolean",
      description:
        "비활성 상태. 현재 구현은 disabled 전용 시각 스타일이 없다 — checked:border-primary/checked:bg-primary만 있고 disabled: 계열 클래스가 없어 Checked+Disabled가 Checked+Enabled와 동일하게 보인다(포인터 커서도 그대로 유지된다). 실 사용처(약관동의 필수 항목 잠금 등)가 생기면 그때 disabled: 스타일을 추가한다.",
    },
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Enabled: Story = {
  parameters: {
    docs: {
      description: { story: "값을 바꿀 수 있는 기본 상태." },
    },
  },
}

export const Disabled: Story = {
  args: { disabled: true },
  parameters: {
    docs: {
      description: {
        story:
          "조건 미충족 등으로 값을 바꿀 수 없을 때 쓴다. 필수 약관처럼 항상 체크돼 있어야 하는 항목을 잠글 때도 쓴다. 위 argTypes 설명대로 시각적으로는 Enabled와 구분되지 않는다.",
      },
    },
  },
}
