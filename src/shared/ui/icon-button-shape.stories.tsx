import type { Meta, StoryObj } from "@storybook/react-vite"
import { X } from "lucide-react"
import { IconButton } from "@/shared/ui/icon-button"

const meta = {
  title: "shared/ui/IconButton/Shape",
  component: IconButton,
  args: {
    "aria-label": "닫기",
    className: "border border-border-strong text-ink-muted hover:bg-surface",
    children: <X className="h-4 w-4" aria-hidden="true" />,
    size: "md",
  },
  parameters: {
    docs: {
      description: {
        component:
          "아이콘 버튼의 형태(shape) 축. size는 md 하나로 고정해 형태 차이만 비교한다. POL-040에 따라 radius는 포함 관계를 나타내는 값이지 장식이 아니다 — 컨트롤 층위인 아이콘 버튼은 원칙적으로 `--radius`(square)를 쓰고, circle은 화면 상단바·플로팅 액션처럼 독립된 원형 컨트롤이 필요할 때만 예외로 쓴다.",
      },
    },
  },
  argTypes: {
    shape: {
      control: "select",
      options: ["square", "circle"],
      description: "정사각 모서리 또는 완전한 원형.",
    },
  },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Square: Story = {
  args: { shape: "square" },
  parameters: {
    docs: {
      description: {
        story:
          "기본 형태. 모달 닫기, 페이지네이션 이전/다음 등 대부분의 아이콘 버튼에 쓴다.",
      },
    },
  },
}

export const Circle: Story = {
  args: { shape: "circle" },
  parameters: {
    docs: {
      description: {
        story:
          "독립된 원형 컨트롤이 필요할 때만 쓴다(예: 헤더의 알림 아이콘, 맨 위로 가기). 업무 블록 내부에서 남발하지 않는다.",
      },
    },
  },
}
