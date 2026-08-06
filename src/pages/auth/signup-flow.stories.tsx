import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { SignupFlow } from "@/pages/auth/signup-flow"
import { WithGuestPage } from "../../../.storybook/decorators/page-providers"

/**
 * 실제 라우트(`src/App.tsx`의 `/signup` 경로)와 동일하게 컨테이너를 그대로 렌더한다.
 * `?step=` 쿼리로 진입 단계를 재현한다 — 컨테이너 내부 상태(`data`)는 각 스토리에서
 * 빈 값으로 시작한다.
 */
const meta = {
  title: "pages/SignupFlow (A02-06 컨테이너)",
  decorators: [WithGuestPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell breadcrumb={["홈", "로그인", "회원가입"]}>
      <SignupFlow />
    </PageShell>
  ),
} satisfies Meta<typeof SignupFlow>

export default meta
type Story = StoryObj<typeof meta>

export const Step1: Story = {
  parameters: { route: "/signup?step=1" },
}

export const Step2: Story = {
  parameters: { route: "/signup?step=2" },
}

export const Step3: Story = {
  parameters: { route: "/signup?step=3" },
}

export const Step4: Story = {
  parameters: { route: "/signup?step=4" },
}

export const Step5: Story = {
  parameters: { route: "/signup?step=5" },
}
