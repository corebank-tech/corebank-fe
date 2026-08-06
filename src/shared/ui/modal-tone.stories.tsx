import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { Modal } from "@/shared/ui/modal"
import { Button } from "@/shared/ui/button"

const PLACEHOLDER_LABEL = "코어뱅크"

type ModalDemoProps = {
  tone: React.ComponentProps<typeof Modal>["tone"]
}

const ModalDemo = ({ tone }: ModalDemoProps) => {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>{PLACEHOLDER_LABEL}</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={PLACEHOLDER_LABEL}
        tone={tone}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button onClick={() => setOpen(false)}>확인</Button>
          </>
        }
      >
        <p className="text-base text-ink">{PLACEHOLDER_LABEL}</p>
      </Modal>
    </>
  )
}

const meta = {
  title: "shared/ui/Modal/Tone",
  component: ModalDemo,
  args: { tone: "primary" },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "타이틀바 색(tone) 축. size는 md 하나로 고정해 색 차이만 비교한다.",
      },
    },
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["primary", "danger"],
      description: "타이틀바 색.",
    },
  },
} satisfies Meta<typeof ModalDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  render: () => <ModalDemo tone="primary" />,
  parameters: {
    docs: {
      description: {
        story: "일반 확인·안내 모달. 대부분의 모달이 이 톤을 쓴다.",
      },
    },
  },
}

export const Danger: Story = {
  render: () => <ModalDemo tone="danger" />,
  parameters: {
    docs: {
      description: {
        story: "해지·삭제처럼 되돌리기 어려운 작업을 확인받을 때 쓴다.",
      },
    },
  },
}
