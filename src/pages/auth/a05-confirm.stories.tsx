import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { A05Confirm } from "@/pages/auth/a05-confirm"
import { WithGuestPage } from "../../../.storybook/decorators/page-providers"

const meta = {
  title: "pages/A05 회원가입 4단계",
  decorators: [WithGuestPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell breadcrumb={["홈", "로그인", "회원가입"]}>
      <A05Confirm onEdit={() => {}} onComplete={() => {}} />
    </PageShell>
  ),
} satisfies Meta<typeof A05Confirm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
