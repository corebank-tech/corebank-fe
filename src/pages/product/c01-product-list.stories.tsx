import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { C01ProductList } from "@/pages/product/c01-product-list"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

const meta = {
  title: "pages/C01 상품목록",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="product"
      breadcrumb={["금융상품", "예금·적금", "상품목록"]}
      title="상품몰 - 상품목록"
    >
      <C01ProductList />
    </PageShell>
  ),
} satisfies Meta<typeof C01ProductList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
