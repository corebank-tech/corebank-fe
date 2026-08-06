import * as React from "react"
import { Button } from "@/shared/ui/button"
import { StepLayout } from "@/shared/ui/step-layout"
import { ResultPanel } from "@/widgets/transfer"
import type { DataGridColumn } from "@/shared/ui/data-grid"

export type ReservedCompleteRow = {
  scheduledDate: React.ReactNode
  fromAccount: React.ReactNode
  toAccount: React.ReactNode
  payeeName: React.ReactNode
  amount: React.ReactNode
  fee: React.ReactNode
  payeeMemo: React.ReactNode
  myMemo: React.ReactNode
}

type ReservedTransferStep3Props = {
  steps: string[]
  row: ReservedCompleteRow
  highlightAmount: React.ReactNode
  onViewReservations: () => void
}

const COLUMNS: DataGridColumn<ReservedCompleteRow>[] = [
  { key: "scheduledDate", header: "이체예정일자", align: "center", width: 120 },
  { key: "fromAccount", header: "출금계좌", align: "center" },
  { key: "toAccount", header: "입금계좌", align: "center" },
  { key: "payeeName", header: "받는분", align: "center", width: 90 },
  { key: "amount", header: "이체금액(원)", align: "right", width: 130 },
  { key: "fee", header: "수수료(원)", align: "right", width: 100 },
  { key: "payeeMemo", header: "받는통장 메모", align: "center", width: 120 },
  { key: "myMemo", header: "내통장 메모", align: "center", width: 120 },
]

/** E-03 예약이체 등록 3단계 · 완료 */
export const ReservedTransferStep3 = ({
  steps,
  row,
  highlightAmount,
  onViewReservations,
}: ReservedTransferStep3Props) => {
  return (
    <StepLayout steps={steps} currentStep={3} title="예약이체">
      <ResultPanel
        variant="success"
        message="예약이체 등록이 완료되었습니다."
        description="이체 예정일 전일 23:59:59까지 예약이체 조회/취소에서 취소할 수 있습니다."
        highlightLabel="이체금액"
        highlightValue={highlightAmount}
        columns={COLUMNS}
        row={row}
        footnote="※ 이체 예정일 당일에는 취소할 수 없으며, 실행 시점에 잔액과 1일 이체한도가 검증됩니다."
        actions={
          <Button
            variant="primary"
            size="lg"
            className="min-w-[180px]"
            onClick={onViewReservations}
          >
            예약이체 조회/취소
          </Button>
        }
      />
    </StepLayout>
  )
}
