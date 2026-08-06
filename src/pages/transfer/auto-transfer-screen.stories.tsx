import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { AutoTransferScreen } from "@/pages/transfer/auto-transfer-screen"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * RequireAuth로 보호되는 화면. 실제 라우트(`src/App.tsx`의 `/transfer/auto/new`
 * 경로)와 동일한 breadcrumb으로 `PageShell`을 조립해 G-01 ~ G-03 전체 흐름을 재현한다.
 */
const meta = {
  title: "pages/G-01 자동이체 등록",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="transfer"
      breadcrumb={["이체", "자동이체", "자동이체 등록"]}
    >
      <AutoTransferScreen />
    </PageShell>
  ),
} satisfies Meta<typeof AutoTransferScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
