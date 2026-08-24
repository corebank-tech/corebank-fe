import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { A04Info } from "@/pages/auth/a04-info"
import type { SignupAuthState, SignupData } from "@/pages/auth/signup-shared"
import { WithGuestPage } from "../../../.storybook/decorators/page-providers"

const EMPTY_DATA: SignupData = {
  name: "",
  birth: "",
  phone: "",
  email: "",
  userId: "",
  password: "",
  passwordConfirm: "",
}

const A04InfoDemo = () => {
  const [data, setData] = React.useState<SignupData>(EMPTY_DATA)
  const [auth, setAuth] = React.useState<SignupAuthState>({})

  return (
    <A04Info
      data={data}
      auth={auth}
      onChange={(partial) => setData((prev) => ({ ...prev, ...partial }))}
      onAuthChange={(partial) => setAuth((prev) => ({ ...prev, ...partial }))}
      onNext={() => {}}
    />
  )
}

const meta = {
  title: "pages/A04 회원가입 3단계",
  decorators: [WithGuestPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell breadcrumb={["홈", "로그인", "회원가입"]}>
      <A04InfoDemo />
    </PageShell>
  ),
} satisfies Meta<typeof A04Info>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
