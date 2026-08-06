import type { Meta, StoryObj } from "@storybook/react-vite"
import { MemoryRouter } from "react-router"
import { AppHeader } from "@/widgets/shell/app-header"
import { MOCK_PROFILE } from "@/entities/customer"

const meta = {
  title: "widgets/shell/AppHeader",
  component: AppHeader,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  args: {
    activeId: "transfer",
    customerName: MOCK_PROFILE.name,
    unreadCount: 0,
    remainingSeconds: 540,
    loggedIn: true,
  },
} satisfies Meta<typeof AppHeader>

export default meta
type Story = StoryObj<typeof meta>

export const LoggedIn: Story = {}

export const WithUnreadNotifications: Story = {
  args: { unreadCount: 12 },
}

export const LoggedOut: Story = {
  args: { loggedIn: false },
}
