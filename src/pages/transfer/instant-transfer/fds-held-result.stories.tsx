import type { Meta, StoryObj } from "@storybook/react-vite"
import { FdsHeldResult } from "@/pages/transfer/instant-transfer/fds-held-result"

const meta = {
  title: "pages/transfer/FdsHeldResult",
  component: FdsHeldResult,
  parameters: { layout: "padded" },
  args: {
    result: {
      withdrawalAccountNumber: "110-***-1201",
      recipientBankName: "신한은행",
      recipientAccountNumber: "088******0392",
      recipientName: "홍길동",
      amount: 500_000,
      requestedAt: "2026-11-08T09:10:00+09:00",
    },
    onConfirm: () => undefined,
    onGoToTransferMenu: () => undefined,
  },
} satisfies Meta<typeof FdsHeldResult>

export default meta
type Story = StoryObj<typeof meta>

/** API에 연결하지 않고 고객용 HELD 결과 UI만 확인한다. */
export const Held: Story = {}
