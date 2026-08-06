import type { Meta, StoryObj } from "@storybook/react-vite"
import { PatternGallery } from "@/pages/design-system/pattern-gallery"

const meta = {
  title: "design-system/PatternGallery",
  component: PatternGallery,
  parameters: { layout: "padded" },
} satisfies Meta<typeof PatternGallery>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
