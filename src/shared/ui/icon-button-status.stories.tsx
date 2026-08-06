import type { Meta, StoryObj } from "@storybook/react-vite"
import { X } from "lucide-react"
import { IconButton } from "@/shared/ui/icon-button"

const meta = {
  title: "shared/ui/IconButton/Status",
  component: IconButton,
  args: {
    "aria-label": "닫기",
    className: "border border-border-strong text-ink-muted hover:bg-surface",
    children: <X className="h-4 w-4" aria-hidden="true" />,
    size: "md",
    shape: "square",
  },
  parameters: {
    docs: {
      description: {
        component:
          "아이콘 버튼의 상호작용 상태 축. size·shape는 md/square로 고정해 상태 차이만 비교한다.",
      },
    },
  },
  argTypes: {
    disabled: {
      control: "boolean",
      description:
        "네이티브 button의 disabled 속성을 그대로 전달한다. 처리 중이라 다시 누르면 안 되는 페이지네이션 이전/다음 등에 쓴다.",
    },
  },
} satisfies Meta<typeof IconButton>

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
          "주의: `iconButtonVariants`(icon-button.tsx) 자체에는 disabled 전용 시각 스타일이 없다 — Chip과 같은 상황이다. IconButton은 색·보더를 항상 호출부 className으로 받으므로, 이 스토리에 고정된 className(`border border-border-strong text-ink-muted hover:bg-surface`)만으로는 클릭이 막혀도 눈으로는 Default와 구분되지 않는다. 실제 화면 중 pagination.tsx는 className에 `disabled:cursor-not-allowed disabled:opacity-40`을 직접 추가해 구분한다 — disabled를 쓰는 새 화면도 className에 같은 처리를 넣어야 한다.",
      },
    },
  },
}
