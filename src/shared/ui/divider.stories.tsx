import type { Meta, StoryObj } from "@storybook/react-vite"
import { Divider } from "@/shared/ui/divider"

const meta = {
  title: "shared/ui/Divider",
  component: Divider,
  parameters: {
    docs: {
      description: {
        component:
          "헤더·툴바·푸터에서 각자 만들던 `|` 구분자 span을 하나로 모은 컴포넌트. 색 톤(tone) 축만 있고, 놓이는 배경에 맞춰 톤을 고른다.",
      },
    },
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["border-strong", "ink-faint", "footer-divider"],
      description: "구분선 색. 헤더·푸터 등 배경 톤에 맞춰 고른다.",
    },
  },
} satisfies Meta<typeof Divider>

export default meta
type Story = StoryObj<typeof meta>

export const InContext: Story = {
  render: () => (
    <div className="flex items-center gap-2 text-ink-muted">
      <span>이용약관</span>
      <Divider tone="border-strong" />
      <span>개인정보처리방침</span>
      <Divider tone="ink-faint" />
      <span>고객센터</span>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "border-strong은 app-header의 메뉴 구분(예: 이용약관/개인정보처리방침)에, ink-faint는 grid-toolbar의 버튼 구분에 쓴다. footer-divider는 footer.tsx 전용 톤으로 이 예시에는 포함하지 않았다.",
      },
    },
  },
}
