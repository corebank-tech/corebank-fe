import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { B07AccountOrder } from "@/pages/account/b07-account-order"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * RequireAuth로 보호되는 화면. 실제 라우트(`src/App.tsx`의 `/user/accounts/order`
 * 경로)와 동일한 breadcrumb·title로 `PageShell`을 조립해 실제로 보이는 화면 전체를
 * 재현한다.
 */
const meta = {
  title: "pages/B07 계좌순서 변경",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="user"
      breadcrumb={["사용자관리", "계좌관리", "계좌순서변경"]}
      title="계좌순서 변경"
    >
      <B07AccountOrder />
    </PageShell>
  ),
} satisfies Meta<typeof B07AccountOrder>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
