import type { Meta, StoryObj } from "@storybook/react-vite"
import { TokenGallery } from "@/pages/design-system/token-gallery"

const meta = {
  title: "design-system/TokenGallery",
  component: TokenGallery,
  parameters: { layout: "padded" },
} satisfies Meta<typeof TokenGallery>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
