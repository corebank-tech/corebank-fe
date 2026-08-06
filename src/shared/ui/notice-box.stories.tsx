import type { Meta, StoryObj } from "@storybook/react-vite"
import { NoticeBox, NoticeBoxFooter } from "@/shared/ui/notice-box"

const meta = {
  title: "shared/ui/NoticeBox",
  parameters: { layout: "padded" },
} satisfies Meta<typeof NoticeBox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <NoticeBox
      items={[
        "계좌 잔액은 조회 시점 기준으로 표시되며 실제 거래 처리 결과와 다를 수 있습니다.",
        "예금·적금계좌는 최근거래일 대신 만기일이 표시됩니다.",
      ]}
    />
  ),
}

export const Footer: Story = {
  render: () => (
    <NoticeBoxFooter
      items={[
        "계좌명은 별명이 등록된 경우 별명을 우선 표시합니다(REQ-ACCT-013).",
        "계좌목록은 CSV 파일로 저장할 수 있으며, 파일에는 마스킹된 계좌번호가 사용됩니다.",
      ]}
    />
  ),
}

export const FooterClosed: Story = {
  render: () => (
    <NoticeBoxFooter
      defaultOpen={false}
      items={[
        "계좌명은 별명이 등록된 경우 별명을 우선 표시합니다(REQ-ACCT-013).",
      ]}
    />
  ),
}
