import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { B01AllAccounts } from "@/pages/inquiry/b01-all-accounts"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * RequireAuth로 보호되는 화면. 실제 라우트(`src/App.tsx`의 `/accounts` 경로)와 동일한
 * breadcrumb·title로 `PageShell`을 조립해 실제로 보이는 화면 전체를 재현한다.
 */
const meta = {
  title: "pages/B01 전체계좌조회",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="inquiry"
      breadcrumb={["조회", "계좌조회", "전체계좌"]}
      title="전체계좌조회"
    >
      <B01AllAccounts />
    </PageShell>
  ),
} satisfies Meta<typeof B01AllAccounts>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
