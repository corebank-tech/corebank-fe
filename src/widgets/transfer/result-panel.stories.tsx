import type { Meta, StoryObj } from "@storybook/react-vite"
import { ResultPanel } from "@/widgets/transfer/result-panel"
import { Button } from "@/shared/ui/button"
import type { DataGridColumn } from "@/shared/ui/data-grid"
import { formatAccountNo, formatAmount } from "@/shared/lib/format"
import { MOCK_PAYEE_ACCOUNTS } from "@/entities/transfer"

type TransferResultRow = {
  toAccountNo: string
  payeeName: string
  fee: number
  balanceAfter: number
}

const ROW: TransferResultRow = {
  toAccountNo: MOCK_PAYEE_ACCOUNTS[0].accountNo,
  payeeName: MOCK_PAYEE_ACCOUNTS[0].payeeName,
  fee: 0,
  balanceAfter: 11_500_000,
}

const COLUMNS: DataGridColumn<TransferResultRow>[] = [
  {
    key: "toAccountNo",
    header: "받는분 계좌번호",
    render: (r) => formatAccountNo(r.toAccountNo),
  },
  { key: "payeeName", header: "받는분" },
  {
    key: "fee",
    header: "수수료",
    align: "right",
    render: (r) => (r.fee === 0 ? "면제" : formatAmount(r.fee)),
  },
  {
    key: "balanceAfter",
    header: "이체후잔액",
    align: "right",
    render: (r) => formatAmount(r.balanceAfter),
  },
]

const meta = {
  title: "widgets/transfer/ResultPanel",
  component: ResultPanel,
  parameters: { layout: "padded" },
  args: {
    columns: COLUMNS,
    row: ROW,
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["success", "fail", "pending"],
      description:
        "결과 상태 아이콘·색상 톤. pending은 아이콘 대신 스피너를 보여준다.",
    },
  },
} satisfies Meta<typeof ResultPanel<TransferResultRow>>

export default meta
type Story = StoryObj<typeof meta>

export const Success: Story = {
  args: {
    variant: "success",
    message: "이체가 완료되었습니다.",
    description: "이체결과조회에서 처리 내역을 확인할 수 있습니다.",
    highlightValue: formatAmount(500_000),
    footnote:
      "※ 이체 후 출금계좌 잔액은 이체결과조회에서 다시 확인할 수 있습니다.",
    actions: (
      <>
        <Button variant="outline" size="lg" className="min-w-35">
          이체결과조회
        </Button>
        <Button variant="primary" size="lg" className="min-w-40">
          자주 쓰는 계좌로 등록
        </Button>
      </>
    ),
  },
}

export const Fail: Story = {
  args: {
    variant: "fail",
    message: "이체가 처리되지 않았습니다.",
    description: "출금계좌 잔액이 부족합니다. (오류코드 E-40312)",
    highlightValue: formatAmount(500_000),
    footnote:
      "※ 실패한 이체는 원장에 반영되지 않으며, 잔액과 거래내역이 변동하지 않습니다. 이체 이력에는 오류 상태로 기록됩니다.",
    actions: (
      <Button variant="outline" size="lg" className="min-w-35">
        이체결과조회
      </Button>
    ),
  },
}

export const Pending: Story = {
  args: {
    variant: "pending",
    message: "이체를 처리하고 있습니다.",
    description: "잠시만 기다려 주세요.",
  },
}
