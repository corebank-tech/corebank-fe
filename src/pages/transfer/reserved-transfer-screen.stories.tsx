import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { ReservedTransferScreen } from "@/pages/transfer/reserved-transfer-screen"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * RequireAuth로 보호되는 화면. 실제 라우트(`src/App.tsx`의 `/transfer/reservation/new`
 * 경로)와 동일한 breadcrumb으로 `PageShell`을 조립해 E-01 ~ E-03 전체 흐름을 재현한다.
 */
const meta = {
  title: "pages/E-01 예약이체 등록",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="transfer"
      breadcrumb={["이체", "예약이체", "예약이체 등록"]}
    >
      <ReservedTransferScreen />
    </PageShell>
  ),
} satisfies Meta<typeof ReservedTransferScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
