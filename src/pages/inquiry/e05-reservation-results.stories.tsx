import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { E05ReservationResults } from "@/pages/inquiry/e05-reservation-results"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * RequireAuth로 보호되는 화면. 실제 라우트(`src/App.tsx`의 `/transfer/reservation/history`
 * 경로)와 동일한 breadcrumb·title로 `PageShell`을 조립해 실제로 보이는 화면 전체를 재현한다.
 */
const meta = {
  title: "pages/E05 예약이체 처리결과 조회",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="transfer"
      breadcrumb={["이체", "예약이체", "예약이체 처리결과 조회"]}
      title="예약이체 처리결과 조회"
    >
      <E05ReservationResults />
    </PageShell>
  ),
} satisfies Meta<typeof E05ReservationResults>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
