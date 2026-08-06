import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { ErrorDialog } from "@/shared/ui/error-dialog"
import { Button } from "@/shared/ui/button"

const ErrorDialogDemo = () => {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        오류 다이얼로그 열기
      </Button>
      <ErrorDialog
        open={open}
        onClose={() => setOpen(false)}
        messages={["비밀번호가 일치하지 않습니다.", "다시 입력해 주세요."]}
        code="E-40312"
      />
    </>
  )
}

const ErrorDialogWithoutCodeDemo = () => {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        오류코드 없는 다이얼로그 열기
      </Button>
      <ErrorDialog
        open={open}
        onClose={() => setOpen(false)}
        messages={["일시적인 오류로 조회에 실패했습니다."]}
      />
    </>
  )
}

const meta = {
  title: "shared/ui/ErrorDialog",
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ErrorDialogDemo>

export default meta
type Story = StoryObj<typeof meta>

export const WithCode: Story = {
  render: () => <ErrorDialogDemo />,
}

export const WithoutCode: Story = {
  render: () => <ErrorDialogWithoutCodeDemo />,
}
