import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { TextViewModal } from "@/shared/ui/text-view-modal"
import { Button } from "@/shared/ui/button"
import { formatAccountNo, formatAmount, formatDate } from "@/shared/lib/format"
import { MOCK_OVERVIEW_ACCOUNTS } from "@/entities/account"

const HEADERS = ["계좌명", "계좌번호", "신규일", "잔액"]
const ROWS = MOCK_OVERVIEW_ACCOUNTS.map((account) => [
  account.alias,
  formatAccountNo(account.accountNo),
  formatDate(account.openedDate),
  formatAmount(account.balance),
])

const TextViewModalDemo = () => {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>점자보기 열기</Button>
      <TextViewModal
        open={open}
        onClose={() => setOpen(false)}
        title="전체계좌조회 점자보기"
        headers={HEADERS}
        rows={ROWS}
      />
    </>
  )
}

const EmptyTextViewModalDemo = () => {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>결과 없음 점자보기 열기</Button>
      <TextViewModal
        open={open}
        onClose={() => setOpen(false)}
        headers={HEADERS}
        rows={[]}
      />
    </>
  )
}

const meta = {
  title: "shared/ui/TextViewModal",
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof TextViewModalDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {
  render: () => <TextViewModalDemo />,
}

export const Empty: Story = {
  render: () => <EmptyTextViewModalDemo />,
}
