import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { B04AccountPassword } from "@/pages/account/b04-account-password"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * RequireAuth로 보호되는 화면. 실제 라우트(`src/App.tsx`의 `/user/accounts/password`
 * 경로)와 동일한 breadcrumb·title로 `PageShell`을 조립해 실제로 보이는 화면 전체를
 * 재현한다.
 */
const meta = {
  title: "pages/B04 계좌비밀번호 변경",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="user"
      breadcrumb={["사용자관리", "계좌관리", "계좌비밀번호"]}
      title="계좌비밀번호 변경"
    >
      <B04AccountPassword />
    </PageShell>
  ),
} satisfies Meta<typeof B04AccountPassword>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
