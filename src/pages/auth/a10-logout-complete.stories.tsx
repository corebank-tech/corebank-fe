import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { A10LogoutComplete } from "@/pages/auth/a10-logout-complete"
import { WithGuestPage } from "../../../.storybook/decorators/page-providers"

const meta = {
  title: "pages/A10 로그아웃 완료",
  decorators: [WithGuestPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell breadcrumb={["홈", "로그아웃"]} title="로그아웃 완료">
      <A10LogoutComplete />
    </PageShell>
  ),
} satisfies Meta<typeof A10LogoutComplete>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
