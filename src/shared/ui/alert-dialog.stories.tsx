import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { AlertDialog } from "@/shared/ui/alert-dialog"
import { Button } from "@/shared/ui/button"

const AlertDialogDemo = () => {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>알림 열기</Button>
      <AlertDialog
        open={open}
        onClose={() => setOpen(false)}
        messages={[
          "1회 이체한도를 초과했습니다.",
          "이체 금액을 다시 확인해 주세요.",
        ]}
      />
    </>
  )
}

const meta = {
  title: "shared/ui/AlertDialog",
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AlertDialogDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <AlertDialogDemo />,
}
