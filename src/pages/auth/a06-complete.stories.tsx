import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { A06Complete } from "@/pages/auth/a06-complete"
import { MOCK_MEMBERS } from "@/entities/auth"
import { WithGuestPage } from "../../../.storybook/decorators/page-providers"

const REGISTERED_NAME = MOCK_MEMBERS[0].ownerName

const meta = {
  title: "pages/A06 회원가입 5단계",
  decorators: [WithGuestPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell breadcrumb={["홈", "로그인", "회원가입"]}>
      <A06Complete name={REGISTERED_NAME} />
    </PageShell>
  ),
} satisfies Meta<typeof A06Complete>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
