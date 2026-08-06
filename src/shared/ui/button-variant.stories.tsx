import type { Meta, StoryObj } from "@storybook/react-vite"
import { Button } from "@/shared/ui/button"

const PLACEHOLDER_LABEL = "코어뱅크"

const meta = {
  title: "shared/ui/Button/Variant",
  component: Button,
  args: { children: PLACEHOLDER_LABEL },
  parameters: {
    docs: {
      description: {
        component:
          "버튼의 강조 수준(variant) 축. 텍스트는 실제 화면 문구가 아니라 임의 문자열로 고정해 콘텐츠와 무관하게 시각적 차이만 비교한다.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "outline", "ghost", "danger"],
      description: "버튼의 강조 수준.",
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: { variant: "primary" },
  parameters: {
    docs: {
      description: {
        story:
          "화면당 핵심 동작 1개에만 쓴다. 이 화면에서 사용자가 하려는 단 하나의 목표(제출·실행)에만 배정한다.",
      },
    },
  },
}

export const Secondary: Story = {
  args: { variant: "secondary" },
  parameters: {
    docs: {
      description: { story: "primary 옆에 놓는 보조 동작(취소 등)에 쓴다." },
    },
  },
}

export const Outline: Story = {
  args: { variant: "outline" },
  parameters: {
    docs: {
      description: { story: "배경 강조 없이 보조 동작을 나타낼 때 쓴다." },
    },
  },
}

export const Ghost: Story = {
  args: { variant: "ghost" },
  parameters: {
    docs: {
      description: { story: "보더·배경 없이 가장 낮은 강조 수준으로 쓴다." },
    },
  },
}

export const Danger: Story = {
  args: { variant: "danger" },
  parameters: {
    docs: {
      description: {
        story: "해지·삭제처럼 되돌리기 어려운 위험 동작에만 쓴다.",
      },
    },
  },
}
