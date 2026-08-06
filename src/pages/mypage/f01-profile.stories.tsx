import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { F01Profile } from "@/pages/mypage/f01-profile"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * RequireAuth로 보호되는 화면. 실제 라우트(`src/App.tsx`의 `/user/profile` 경로)와
 * 동일한 breadcrumb·title로 `PageShell`을 조립해 실제로 보이는 화면 전체를 재현한다.
 */
const meta = {
  title: "pages/F01 고객정보 조회변경",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="user"
      breadcrumb={["사용자관리", "고객정보관리"]}
      title="고객정보 조회/변경"
    >
      <F01Profile />
    </PageShell>
  ),
} satisfies Meta<typeof F01Profile>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
