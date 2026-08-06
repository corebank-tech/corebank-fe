import type { Meta, StoryObj } from "@storybook/react-vite"
import { PrimitiveGallery } from "@/pages/design-system/primitive-gallery"

const meta = {
  title: "design-system/PrimitiveGallery",
  component: PrimitiveGallery,
  parameters: { layout: "padded" },
} satisfies Meta<typeof PrimitiveGallery>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
