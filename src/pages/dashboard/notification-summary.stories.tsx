import type { Meta, StoryObj } from "@storybook/react-vite"
import { NotificationSummary } from "@/pages/dashboard/notification-summary"
import type { NotificationInboxRow } from "@/entities/notification"

const SAMPLE_UNREAD_NOTIFICATIONS: NotificationInboxRow[] = [
  {
    notificationId: 3,
    typeName: "이체",
    title: "이체가 정상 처리되었습니다.",
    content: "자유입출금에서 김*수님께 500,000원을 이체했습니다.",
    occurredAt: "2026-11-07T10:00:00+09:00",
    isRead: false,
  },
  {
    notificationId: 2,
    typeName: "예약이체",
    title: "예약이체 1건이 정상 처리되었습니다.",
    content: "2026.11.06 자유입출금 → 김*수 500,000원",
    occurredAt: "2026-11-06T00:10:12+09:00",
    isRead: false,
  },
]

const meta = {
  title: "pages/dashboard/NotificationSummary",
  component: NotificationSummary,
  args: { items: SAMPLE_UNREAD_NOTIFICATIONS, totalCount: 2 },
  parameters: { layout: "padded" },
} satisfies Meta<typeof NotificationSummary>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  args: { items: [], totalCount: 0 },
}
