import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { A07FindId } from "@/pages/auth/a07-find-id"
import { WithGuestPage } from "../../../.storybook/decorators/page-providers"

const meta = {
  title: "pages/A07 아이디 찾기",
  decorators: [WithGuestPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell breadcrumb={["홈", "로그인", "아이디 찾기"]} title="아이디 찾기">
      <A07FindId />
    </PageShell>
  ),
} satisfies Meta<typeof A07FindId>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
