import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { D05TransferLimit } from "@/pages/transfer/d05-transfer-limit"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * RequireAuth로 보호되는 화면. 실제 라우트(`src/App.tsx`의 `/user/transfer-limit` 경로)와
 * 동일한 breadcrumb·title로 `PageShell`을 조립해 실제로 보이는 화면 전체를 재현한다.
 */
const meta = {
  title: "pages/D05 이체한도 조회/변경",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="user"
      breadcrumb={["사용자관리", "이체한도관리"]}
      title="이체한도 조회/변경"
    >
      <D05TransferLimit />
    </PageShell>
  ),
} satisfies Meta<typeof D05TransferLimit>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
