import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { B05WithdrawAccounts } from "@/pages/account/b05-withdraw-accounts"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * RequireAuth로 보호되는 화면. 실제 라우트(`src/App.tsx`의 `/user/accounts/withdrawal`
 * 경로)와 동일한 breadcrumb·title로 `PageShell`을 조립해 실제로 보이는 화면 전체를
 * 재현한다.
 */
const meta = {
  title: "pages/B05 출금계좌관리",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="user"
      breadcrumb={["사용자관리", "계좌관리", "출금계좌관리"]}
      title="출금계좌관리"
    >
      <B05WithdrawAccounts />
    </PageShell>
  ),
} satisfies Meta<typeof B05WithdrawAccounts>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
