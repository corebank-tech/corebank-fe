import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { F02NotificationInbox } from "@/pages/inquiry/f02-notification-inbox"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * RequireAuth로 보호되는 화면. 실제 라우트(`src/App.tsx`의 `/notifications` 경로)와
 * 동일한 breadcrumb·title로 `PageShell`을 조립해 실제로 보이는 화면 전체를 재현한다.
 */
const meta = {
  title: "pages/F02 알림함",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell breadcrumb={["헤더", "알림"]} title="알림함">
      <F02NotificationInbox />
    </PageShell>
  ),
} satisfies Meta<typeof F02NotificationInbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
