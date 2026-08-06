import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { A08ResetPassword } from "@/pages/auth/a08-reset-password"
import { WithGuestPage } from "../../../.storybook/decorators/page-providers"

const meta = {
  title: "pages/A08 비밀번호 재설정",
  decorators: [WithGuestPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      breadcrumb={["홈", "로그인", "비밀번호 재설정"]}
      title="비밀번호 재설정"
    >
      <A08ResetPassword />
    </PageShell>
  ),
} satisfies Meta<typeof A08ResetPassword>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
