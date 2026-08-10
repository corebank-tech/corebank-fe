import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { InstantTransferStep3 } from "@/pages/transfer/instant-transfer/d03-result"
import { TRANSFER_STEPS } from "@/pages/transfer/transfer-steps"
import { ResultPanel } from "@/widgets/transfer"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import type { DataGridColumn } from "@/shared/ui/data-grid"
import {
  MOCK_TRANSFER_RESULT,
  type TransferResultRow,
} from "@/entities/transfer"
import {
  formatAccountNo,
  formatAmount,
  formatDateTime,
  maskName,
} from "@/shared/lib/format"
import { WithAuthenticatedPage } from "../../../../.storybook/decorators/page-providers"

/** InstantTransferScreen의 step === 3 분기에서 그대로 가져온 결과 그리드 컬럼. */
const buildColumns = (
  isSuccess: boolean,
): DataGridColumn<TransferResultRow>[] => [
  {
    key: "result",
    header: "결과",
    align: "center",
    width: 70,
    render: () => (
      <Badge variant={isSuccess ? "success" : "danger"}>
        {isSuccess ? "정상" : "오류"}
      </Badge>
    ),
  },
  {
    key: "transactionId",
    header: "거래번호",
    align: "center",
    width: 190,
    render: (r) => <span>{r.transactionId}</span>,
  },
  {
    key: "processedAt",
    header: "거래일시",
    align: "center",
    width: 150,
    render: (r) => <span>{formatDateTime(r.processedAt)}</span>,
  },
  {
    key: "fromAccountNo",
    header: "출금계좌",
    align: "center",
    render: (r) => <span>{formatAccountNo(r.fromAccountNo)}</span>,
  },
  {
    key: "toAccountNo",
    header: "입금계좌",
    align: "center",
    render: (r) => <span>{formatAccountNo(r.toAccountNo)}</span>,
  },
  {
    key: "payeeName",
    header: "받는분",
    align: "center",
    width: 90,
    render: (r) => maskName(r.payeeName),
  },
  {
    key: "amount",
    header: "이체금액(원)",
    align: "right",
    width: 130,
    render: (r) => formatAmount(r.amount, { suffix: false }),
  },
  {
    key: "fee",
    header: "수수료(원)",
    align: "right",
    width: 100,
    render: (r) => formatAmount(r.fee, { suffix: false }),
  },
  {
    key: "balanceAfter",
    header: "이체후잔액(원)",
    align: "right",
    width: 140,
    render: (r) => formatAmount(r.balanceAfter, { suffix: false }),
  },
]

type Step3DemoProps = {
  variant: "success" | "fail"
}

const InstantTransferStep3Demo = ({ variant }: Step3DemoProps) => {
  const isSuccess = variant === "success"
  const row: TransferResultRow = isSuccess
    ? MOCK_TRANSFER_RESULT
    : { ...MOCK_TRANSFER_RESULT, transactionId: "-" }

  return (
    <InstantTransferStep3
      steps={TRANSFER_STEPS}
      onNewTransfer={() => {}}
      resultSlot={
        <ResultPanel
          variant={variant}
          message={
            isSuccess ? "이체가 완료되었습니다." : "이체가 처리되지 않았습니다."
          }
          description={
            isSuccess
              ? "이체결과조회에서 처리 내역을 확인할 수 있습니다."
              : "일시적인 시스템 오류로 이체가 처리되지 않았습니다. 잠시 후 다시 시도하세요. (오류코드 ERR-9001)"
          }
          highlightValue={formatAmount(row.amount)}
          footnote={
            isSuccess
              ? "※ 이체 후 출금계좌 잔액은 이체결과조회에서 다시 확인할 수 있습니다."
              : "※ 실패한 이체는 원장에 반영되지 않으며, 잔액과 거래내역이 변동하지 않습니다. 이체 이력에는 오류 상태로 기록됩니다."
          }
          columns={buildColumns(isSuccess)}
          row={row}
          actions={
            <>
              <Button variant="outline" size="lg" className="min-w-35">
                이체결과조회
              </Button>
              {isSuccess && (
                <Button variant="primary" size="lg" className="min-w-40">
                  자주 쓰는 계좌로 등록
                </Button>
              )}
            </>
          }
        />
      }
    />
  )
}

const meta = {
  title: "pages/D-03 즉시이체 · 완료",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="transfer"
      breadcrumb={["이체", "즉시이체", "당행이체"]}
    >
      <InstantTransferStep3Demo variant="success" />
    </PageShell>
  ),
} satisfies Meta<typeof InstantTransferStep3>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** REQ-TRSF-019: 계좌확인은 통과했지만 실행 단계에서 시스템 오류로 실패한 경우. */
export const Fail: Story = {
  render: () => (
    <PageShell
      activeId="transfer"
      breadcrumb={["이체", "즉시이체", "당행이체"]}
    >
      <InstantTransferStep3Demo variant="fail" />
    </PageShell>
  ),
}
