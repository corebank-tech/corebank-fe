import type { Meta, StoryObj } from "@storybook/react-vite"
import { MemoryRouter } from "react-router"
import { SideNav } from "@/widgets/shell/side-nav"

const meta = {
  title: "widgets/shell/SideNav",
  component: SideNav,
  parameters: { layout: "padded" },
  args: { activeId: "transfer" },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/transfer/reservation"]}>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof SideNav>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const InquiryCategory: Story = {
  args: { activeId: "inquiry" },
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={["/accounts"]}>
        <Story />
      </MemoryRouter>
    ),
  ],
}
