import type { Meta, StoryObj } from "@storybook/react-vite"
import { ModalFamilyGallery } from "@/pages/design-system/modal-family-gallery"

const meta = {
  title: "design-system/ModalFamilyGallery",
  component: ModalFamilyGallery,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ModalFamilyGallery>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
