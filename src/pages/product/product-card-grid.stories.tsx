import type { Meta, StoryObj } from "@storybook/react-vite"
import { ProductCardGrid } from "@/pages/product/product-card-grid"
import { MOCK_PRODUCTS } from "@/entities/product"

const meta = {
  title: "pages/product/ProductCardGrid",
  component: ProductCardGrid,
  args: { products: MOCK_PRODUCTS },
} satisfies Meta<typeof ProductCardGrid>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  args: { products: [] },
}
