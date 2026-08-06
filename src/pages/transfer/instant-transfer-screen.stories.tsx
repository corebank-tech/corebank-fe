import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { InstantTransferScreen } from "@/pages/transfer/instant-transfer-screen"
import { MOCK_TRANSFER_ACCOUNTS } from "@/entities/transfer"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * RequireAuth로 보호되는 화면. 실제 라우트(`src/App.tsx`의 `/instant-transfer` 경로)와
 * 동일한 breadcrumb으로 `PageShell`을 조립해 D-01 ~ D-03 전체 흐름을 재현한다.
 */
const meta = {
  title: "pages/D-01 즉시이체",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="transfer"
      breadcrumb={["이체", "즉시이체", "당행이체"]}
    >
      <InstantTransferScreen />
    </PageShell>
  ),
} satisfies Meta<typeof InstantTransferScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/**
 * 전체계좌조회(B-01) 등에서 [이체] 진입 시 `?from=`으로 넘어온 출금계좌가
 * 선택된 상태로 시작한다(REQ-INQR-005).
 */
export const FromDashboard: Story = {
  parameters: {
    route: `/instant-transfer?from=${MOCK_TRANSFER_ACCOUNTS[0].accountNo}`,
  },
}
