import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { B06AccountAlias } from "@/pages/account/b06-account-alias"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * RequireAuth로 보호되는 화면. 실제 라우트(`src/App.tsx`의 `/user/accounts/alias`
 * 경로)와 동일한 breadcrumb·title로 `PageShell`을 조립해 실제로 보이는 화면 전체를
 * 재현한다.
 */
const meta = {
  title: "pages/B06 계좌별명 관리",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="user"
      breadcrumb={["사용자관리", "계좌관리", "계좌별명관리"]}
      title="계좌별명 관리"
    >
      <B06AccountAlias />
    </PageShell>
  ),
} satisfies Meta<typeof B06AccountAlias>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
