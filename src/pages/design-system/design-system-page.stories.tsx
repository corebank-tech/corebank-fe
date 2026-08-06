import type { Meta, StoryObj } from "@storybook/react-vite"
import { DesignSystemPage } from "@/pages/design-system/design-system-page"

const meta = {
  title: "design-system/DesignSystemPage (탭 전체)",
  component: DesignSystemPage,
  parameters: { layout: "padded" },
} satisfies Meta<typeof DesignSystemPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
