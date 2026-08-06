import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { B03TransactionInquiry } from "@/pages/b03-transaction-inquiry"
import { WithAuthenticatedPage } from "../../.storybook/decorators/page-providers"

/**
 * RequireAuth로 보호되는 화면. 실제 라우트(`src/App.tsx`의 `/inquiry` 경로)와 동일한
 * breadcrumb·title·notice로 `PageShell`을 조립해 실제로 보이는 화면 전체를 재현한다.
 */
const meta = {
  title: "pages/B03 거래내역조회",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="inquiry"
      breadcrumb={["조회", "계좌조회", "거래내역"]}
      title="거래내역조회"
      notice={[
        "거래내역은 최근 1년 이내의 범위에서 조회할 수 있습니다.",
        "조회 기준일시 이후 발생한 거래는 다음 조회 시 반영됩니다.",
        "실제 잔액은 미결제 거래 처리 상태에 따라 달라질 수 있습니다.",
      ]}
    >
      <B03TransactionInquiry />
    </PageShell>
  ),
} satisfies Meta<typeof B03TransactionInquiry>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
