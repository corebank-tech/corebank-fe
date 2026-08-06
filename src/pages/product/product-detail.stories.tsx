import type { Meta, StoryObj } from "@storybook/react-vite"
import { ProductDetail } from "@/pages/product/product-detail"
import { MOCK_PRODUCT_DETAILS } from "@/entities/product"

const meta = {
  title: "pages/product/ProductDetail",
  component: ProductDetail,
  args: { product: MOCK_PRODUCT_DETAILS.P001 },
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProductDetail>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
