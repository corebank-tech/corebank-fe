import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { SessionExpiredModal } from "@/entities/auth/ui/session-expired-modal"
import { Button } from "@/shared/ui/button"

type SessionExpiredModalDemoProps = {
  withMainScreenButton: boolean
}

const SessionExpiredModalDemo = ({
  withMainScreenButton,
}: SessionExpiredModalDemoProps) => {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>세션 만료 모달 열기</Button>
      <SessionExpiredModal
        open={open}
        onRelogin={() => setOpen(false)}
        onMainScreen={withMainScreenButton ? () => setOpen(false) : undefined}
      />
    </>
  )
}

const meta = {
  title: "entities/auth/SessionExpiredModal",
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SessionExpiredModalDemo>

export default meta
type Story = StoryObj<typeof meta>

export const ReloginOnly: Story = {
  render: () => <SessionExpiredModalDemo withMainScreenButton={false} />,
}

export const WithMainScreenButton: Story = {
  render: () => <SessionExpiredModalDemo withMainScreenButton={true} />,
}
