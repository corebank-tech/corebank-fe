import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { A03Verify } from "@/pages/auth/a03-verify"
import { WithGuestPage } from "../../../.storybook/decorators/page-providers"

const meta = {
  title: "pages/A03 회원가입 2단계",
  decorators: [WithGuestPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell breadcrumb={["홈", "로그인", "회원가입"]}>
      <A03Verify onVerified={() => {}} />
    </PageShell>
  ),
} satisfies Meta<typeof A03Verify>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
