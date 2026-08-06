import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { MemoryRouter } from "react-router"
import { FullMenuOverlay } from "@/widgets/shell/full-menu-overlay"
import { Button } from "@/shared/ui/button"

const FullMenuOverlayDemo = () => {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>전체메뉴 열기</Button>
      <FullMenuOverlay open={open} onClose={() => setOpen(false)} />
    </>
  )
}

const meta = {
  title: "widgets/shell/FullMenuOverlay",
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof FullMenuOverlayDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <FullMenuOverlayDemo />,
}
