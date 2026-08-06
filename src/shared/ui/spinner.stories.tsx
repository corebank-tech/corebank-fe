import type { Meta, StoryObj } from "@storybook/react-vite"
import { Spinner } from "@/shared/ui/spinner"

const meta = {
  title: "shared/ui/Spinner",
  component: Spinner,
  parameters: {
    docs: {
      description: {
        component:
          "로딩 표시 아이콘. 크기(size) 축만 있다. widgets/transfer/result-panel.tsx의 '처리중' 상태가 첫 사용처다.",
      },
    },
  },
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
} satisfies Meta<typeof Spinner>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: "기본 크기(md). 별도 크기 지정 없이 인라인으로 쓸 때 쓴다.",
      },
    },
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4 text-primary">
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "sm은 버튼·인라인 텍스트 옆처럼 좁은 공간에, md는 기본 사용처(예: 이체 결과 처리중 상태)에, lg는 패널 전체를 대체하는 로딩 화면처럼 단독으로 크게 보여줄 때 쓴다.",
      },
    },
  },
}
