import type { Meta, StoryObj } from "@storybook/react-vite"
import { Chip } from "@/shared/ui/chip"

const PLACEHOLDER_LABEL = "코어뱅크"

const meta = {
  title: "shared/ui/Chip/Tone",
  component: Chip,
  args: { children: PLACEHOLDER_LABEL },
  parameters: {
    docs: {
      description: {
        component:
          "토글 칩의 색 톤(tone) 축. 화면마다 실제로 쓰이던 색 조합을 그대로 옮긴 것이라 새 톤을 추가하지 않는다.",
      },
    },
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["default", "active", "primary", "primary-tint", "muted"],
      description: "화면마다 실제로 쓰이던 색 조합을 그대로 옮긴 톤.",
    },
  },
} satisfies Meta<typeof Chip>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { tone: "default" },
  parameters: {
    docs: {
      description: { story: "선택되지 않은 기본 옵션 상태." },
    },
  },
}

export const Active: Story = {
  args: { tone: "active" },
  parameters: {
    docs: {
      description: { story: "현재 선택된 옵션. 기간 프리셋·필터 칩에서 쓴다." },
    },
  },
}

export const Primary: Story = {
  args: { tone: "primary" },
  parameters: {
    docs: {
      description: { story: "브랜드 강조가 필요한 선택 상태." },
    },
  },
}

export const PrimaryTint: Story = {
  args: { tone: "primary-tint" },
  parameters: {
    docs: {
      description: {
        story:
          "primary보다 약한 강조. 배경을 옅게 깔아 강조하되 눈에 덜 띄어야 할 때 쓴다.",
      },
    },
  },
}

export const Muted: Story = {
  args: { tone: "muted" },
  parameters: {
    docs: {
      description: { story: "보조 정보로 후퇴시킬 때 쓰는 저강조 톤." },
    },
  },
}
