import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { OtpModal } from "@/entities/auth/ui/otp-modal"
import { Button } from "@/shared/ui/button"

const OtpModalDemo = () => {
  const [open, setOpen] = React.useState(false)
  const [confirmedCode, setConfirmedCode] = React.useState<string | null>(null)

  return (
    <>
      <Button onClick={() => setOpen(true)}>OTP 인증 모달 열기</Button>
      {confirmedCode && (
        <p className="mt-3 text-base font-bold text-success">
          OTP 인증이 완료되었습니다. (입력값 {confirmedCode})
        </p>
      )}
      <OtpModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={(code) => {
          setConfirmedCode(code)
          setOpen(false)
        }}
        guide="이체를 진행하려면 OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하세요."
      />
    </>
  )
}

const meta = {
  title: "entities/auth/OtpModal",
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof OtpModalDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <OtpModalDemo />,
}
