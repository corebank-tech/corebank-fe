import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { G05AutoTransferResults } from "@/pages/inquiry/g05-auto-transfer-results"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * RequireAuth로 보호되는 화면. 실제 라우트(`src/App.tsx`의 `/transfer/auto/history` 경로)와
 * 동일한 breadcrumb·title로 `PageShell`을 조립해 실제로 보이는 화면 전체를 재현한다.
 */
const meta = {
  title: "pages/G05 자동이체 결과조회",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="transfer"
      breadcrumb={["이체", "자동이체", "자동이체결과 조회"]}
      title="자동이체 결과조회"
    >
      <G05AutoTransferResults />
    </PageShell>
  ),
} satisfies Meta<typeof G05AutoTransferResults>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
