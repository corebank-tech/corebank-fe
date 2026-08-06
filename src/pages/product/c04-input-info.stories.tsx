import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { C04InputInfo } from "@/pages/product/c04-input-info"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * C-03(약관동의)은 폼 데이터 없이 다음 단계로 이동한다 — `useLocation().state`가
 * `null`인 이 상태가 실제로 C-05에서 도달하는 정상 진입 상태다.
 */
const meta = {
  title: "pages/C04 상품가입 2단계",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell activeId="product" breadcrumb={["금융상품", "가입"]}>
      <C04InputInfo />
    </PageShell>
  ),
} satisfies Meta<typeof C04InputInfo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
