import type { Meta, StoryObj } from "@storybook/react-vite"
import { Button } from "@/shared/ui/button"

const PLACEHOLDER_LABEL = "코어뱅크"

const meta = {
  title: "shared/ui/Button/Status",
  component: Button,
  args: { children: PLACEHOLDER_LABEL, variant: "primary" },
  parameters: {
    docs: {
      description: {
        component:
          "버튼의 상호작용 상태 축. variant는 primary 하나로 고정해 상태 차이만 비교한다.",
      },
    },
  },
  argTypes: {
    disabled: {
      control: "boolean",
      description:
        "비활성 상태. opacity로 흐리지 않고 무채색(surface + border + ink-faint)으로 전환한다 — 흐린 primary blue는 눌러도 될 것처럼 보이는 문제가 있었다.",
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  parameters: {
    docs: {
      description: { story: "누를 수 있는 기본 상태." },
    },
  },
}

export const Disabled: Story = {
  args: { disabled: true },
  parameters: {
    docs: {
      description: {
        story:
          "필수 입력이 안 채워졌거나 처리 중일 때 쓴다. 이유를 알 수 없는 비활성화는 피하고, 근처에 왜 비활성인지 안내를 둔다.",
      },
    },
  },
}
