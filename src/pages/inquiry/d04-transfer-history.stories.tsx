import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { D04TransferHistory } from "@/pages/inquiry/d04-transfer-history"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * RequireAuth로 보호되는 화면. 실제 라우트(`src/App.tsx`의 `/transfer/history` 경로)와
 * 동일한 breadcrumb·title로 `PageShell`을 조립해 실제로 보이는 화면 전체를 재현한다.
 */
const meta = {
  title: "pages/D04 이체결과조회",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="transfer"
      breadcrumb={["이체", "즉시이체", "이체결과조회"]}
      title="이체결과조회"
    >
      <D04TransferHistory />
    </PageShell>
  ),
} satisfies Meta<typeof D04TransferHistory>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
