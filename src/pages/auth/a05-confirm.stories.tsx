import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { A05Confirm } from "@/pages/auth/a05-confirm"
import type { SignupData } from "@/pages/auth/signup-shared"
import { MOCK_MEMBERS } from "@/entities/auth"
import { WithGuestPage } from "../../../.storybook/decorators/page-providers"

const REGISTERING_MEMBER = MOCK_MEMBERS[0]

const MOCK_DATA: SignupData = {
  name: REGISTERING_MEMBER.ownerName,
  birth: REGISTERING_MEMBER.birth,
  phone: "01012345678",
  email: REGISTERING_MEMBER.email,
  userId: REGISTERING_MEMBER.memberId,
  password: REGISTERING_MEMBER.loginPassword,
}

const meta = {
  title: "pages/A05 회원가입 4단계",
  decorators: [WithGuestPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell breadcrumb={["홈", "로그인", "회원가입"]}>
      <A05Confirm data={MOCK_DATA} onEdit={() => {}} onComplete={() => {}} />
    </PageShell>
  ),
} satisfies Meta<typeof A05Confirm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
