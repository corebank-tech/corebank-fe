import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { B02DepositAccounts } from "@/pages/inquiry/b02-deposit-accounts"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * RequireAuth로 보호되는 화면. 실제 라우트(`src/App.tsx`의 `/accounts/deposits` 경로)와
 * 동일한 breadcrumb·title로 `PageShell`을 조립해 실제로 보이는 화면 전체를 재현한다.
 */
const meta = {
  title: "pages/B02 예금적금 계좌조회",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="inquiry"
      breadcrumb={["조회", "계좌조회", "예금·적금"]}
      title="예금/적금 계좌조회"
    >
      <B02DepositAccounts />
    </PageShell>
  ),
} satisfies Meta<typeof B02DepositAccounts>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
