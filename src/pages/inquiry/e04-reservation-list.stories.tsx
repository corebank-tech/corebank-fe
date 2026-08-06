import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { E04ReservationList } from "@/pages/inquiry/e04-reservation-list"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * RequireAuth로 보호되는 화면. 실제 라우트(`src/App.tsx`의 `/transfer/reservation` 경로)와
 * 동일한 breadcrumb·title로 `PageShell`을 조립해 실제로 보이는 화면 전체를 재현한다.
 */
const meta = {
  title: "pages/E04 예약이체 조회/취소",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="transfer"
      breadcrumb={["이체", "예약이체", "예약이체등록 조회·취소"]}
      title="예약이체 조회/취소"
    >
      <E04ReservationList />
    </PageShell>
  ),
} satisfies Meta<typeof E04ReservationList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
