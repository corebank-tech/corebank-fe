import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { A02Terms } from "@/pages/auth/a02-terms"
import { WithGuestPage } from "../../../.storybook/decorators/page-providers"

const meta = {
  title: "pages/A02 회원가입 1단계",
  decorators: [WithGuestPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell breadcrumb={["홈", "로그인", "회원가입"]}>
      <A02Terms onNext={() => {}} />
    </PageShell>
  ),
} satisfies Meta<typeof A02Terms>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
