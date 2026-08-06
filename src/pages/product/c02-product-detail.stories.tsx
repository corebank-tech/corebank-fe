import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { C02ProductDetail } from "@/pages/product/c02-product-detail"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

/**
 * `useParams()`가 `MemoryRouter`에 매칭되는 라우트 없이 빈 객체를 반환하므로
 * 컴포넌트의 `productId = "P001"` 기본값이 그대로 적용된다.
 */
const meta = {
  title: "pages/C02 상품상세",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="product"
      breadcrumb={["금융상품", "예금·적금", "상품상세"]}
      title="상품 상세"
    >
      <C02ProductDetail />
    </PageShell>
  ),
} satisfies Meta<typeof C02ProductDetail>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
