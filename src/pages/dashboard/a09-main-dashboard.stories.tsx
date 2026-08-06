import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { A09MainDashboard } from "@/pages/dashboard/a09-main-dashboard"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * RequireAuth로 보호되는 화면. 실제 라우트(`src/App.tsx`의 `/dashboard` 경로)와 동일한
 * breadcrumb·title로 `PageShell`을 조립해 실제로 보이는 화면 전체를 재현한다.
 */
const meta = {
  title: "pages/A09 메인 대시보드",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell breadcrumb={["개인", "메인", "대시보드"]} title="메인 대시보드">
      <A09MainDashboard />
    </PageShell>
  ),
} satisfies Meta<typeof A09MainDashboard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const EmptyAccounts: Story = {
  render: () => (
    <PageShell breadcrumb={["개인", "메인", "대시보드"]} title="메인 대시보드">
      <A09MainDashboard accounts={[]} />
    </PageShell>
  ),
}
