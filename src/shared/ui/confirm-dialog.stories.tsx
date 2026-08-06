import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { Button } from "@/shared/ui/button"
import { MOCK_PAYEE_NAME, MOCK_PAYEE_ACCOUNTS } from "@/entities/transfer"
import { formatAccountNo, formatAmount } from "@/shared/lib/format"

const DEMO_PAYEE_ACCOUNT_NO = MOCK_PAYEE_ACCOUNTS[0].accountNo

const ConfirmDialogDemo = () => {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>거래내용 확인창 열기</Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        items={[
          { label: "받는분", value: MOCK_PAYEE_NAME },
          {
            label: "받는분 계좌번호",
            value: formatAccountNo(DEMO_PAYEE_ACCOUNT_NO),
          },
          { label: "이체금액", value: formatAmount(500_000) },
        ]}
      />
    </>
  )
}

const ConfirmDialogMessagesOnlyDemo = () => {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>출금계좌 삭제 확인창 열기</Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        title="출금계좌 삭제"
        messages={["이 출금계좌를 삭제하시겠습니까?"]}
      />
    </>
  )
}

const meta = {
  title: "shared/ui/ConfirmDialog",
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ConfirmDialogDemo>

export default meta
type Story = StoryObj<typeof meta>

export const WithItems: Story = {
  render: () => <ConfirmDialogDemo />,
}

export const MessagesOnly: Story = {
  render: () => <ConfirmDialogMessagesOnlyDemo />,
}
