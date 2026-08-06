import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { Modal } from "@/shared/ui/modal"
import { Button } from "@/shared/ui/button"

const PLACEHOLDER_LABEL = "코어뱅크"

type ModalDemoProps = {
  size: React.ComponentProps<typeof Modal>["size"]
}

const ModalDemo = ({ size }: ModalDemoProps) => {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>{PLACEHOLDER_LABEL}</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={PLACEHOLDER_LABEL}
        size={size}
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
  title: "shared/ui/Modal/Size",
  component: ModalDemo,
  args: { size: "md" },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "모달 너비(size) 축. tone은 primary 하나로 고정해 크기 차이만 비교한다.",
      },
    },
  },
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "모달 최대 너비.",
    },
  },
} satisfies Meta<typeof ModalDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Small: Story = {
  render: () => <ModalDemo size="sm" />,
  parameters: {
    docs: {
      description: { story: "짧은 확인 메시지 한두 줄에 쓴다." },
    },
  },
}

export const Medium: Story = {
  render: () => <ModalDemo size="md" />,
  parameters: {
    docs: {
      description: { story: "기본 크기. 대부분의 확인·안내 모달에 쓴다." },
    },
  },
}

export const Large: Story = {
  render: () => <ModalDemo size="lg" />,
  parameters: {
    docs: {
      description: { story: "표·폼처럼 내용이 많은 모달에 쓴다." },
    },
  },
}
