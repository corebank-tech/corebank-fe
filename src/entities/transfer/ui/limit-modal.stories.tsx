import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { LimitModal } from "@/entities/transfer/ui/limit-modal"
import { Button } from "@/shared/ui/button"
import { MOCK_TRANSFER_LIMITS } from "@/entities/transfer/api/transfer"

const LimitModalDemo = () => {
  const [open, setOpen] = React.useState(false)
  const dailyRemaining =
    MOCK_TRANSFER_LIMITS.perDay - MOCK_TRANSFER_LIMITS.usedToday

  return (
    <>
      <Button onClick={() => setOpen(true)}>이체한도 조회 모달 열기</Button>
      <LimitModal
        open={open}
        onClose={() => setOpen(false)}
        perDay={MOCK_TRANSFER_LIMITS.perDay}
        perTransfer={MOCK_TRANSFER_LIMITS.perTransfer}
        dailyRemaining={dailyRemaining}
        onChangeLimit={() => setOpen(false)}
      />
    </>
  )
}

const meta = {
  title: "entities/transfer/LimitModal",
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof LimitModalDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <LimitModalDemo />,
}
