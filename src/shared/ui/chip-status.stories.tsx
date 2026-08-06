import type { Meta, StoryObj } from "@storybook/react-vite"
import { Chip } from "@/shared/ui/chip"

const PLACEHOLDER_LABEL = "코어뱅크"

const meta = {
  title: "shared/ui/Chip/Status",
  component: Chip,
  args: { children: PLACEHOLDER_LABEL, tone: "default" },
  parameters: {
    docs: {
      description: {
        component:
          "칩의 상호작용 상태 축. tone은 default 하나로 고정해 상태 차이만 비교한다.",
      },
    },
  },
  argTypes: {
    disabled: {
      control: "boolean",
      description: "선택할 수 없는 옵션(재고 소진, 조건 미충족 등)에 쓴다.",
    },
  },
} satisfies Meta<typeof Chip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  parameters: {
    docs: {
      description: { story: "선택할 수 있는 기본 상태." },
    },
  },
}

export const Disabled: Story = {
  args: { disabled: true },
  parameters: {
    docs: {
      description: {
        story:
          "현재 조건에서 고를 수 없는 옵션임을 나타낼 때 쓴다. 주의: Chip은 Button과 달리 disabled 전용 시각 스타일이 없다 — 클릭만 막힐 뿐 색이 그대로라 사용자가 구분하기 어렵다. 실제로 이 상태를 쓰는 화면이 생기면 chip.tsx에 disabled 스타일을 추가해야 한다.",
      },
    },
  },
}
