import type { Meta, StoryObj } from "@storybook/react-vite"
import { CompositionGallery } from "@/pages/design-system/composition-gallery"

const meta = {
  title: "design-system/CompositionGallery",
  component: CompositionGallery,
  parameters: { layout: "padded" },
} satisfies Meta<typeof CompositionGallery>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
