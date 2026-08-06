import * as React from "react"
import { Button } from "@/shared/ui/button"
import { StepLayout } from "@/shared/ui/step-layout"
import { ResultPanel } from "@/widgets/transfer"
import type { DataGridColumn } from "@/shared/ui/data-grid"

export type AutoCompleteRow = {
  fromAccount: React.ReactNode
  toAccount: React.ReactNode
  payeeName: React.ReactNode
  amount: React.ReactNode
  period: React.ReactNode
  cycle: React.ReactNode
  dayOfMonth: React.ReactNode
  nextExecDate: React.ReactNode
}

type AutoTransferStep3Props = {
  steps: string[]
  row: AutoCompleteRow
  highlightAmount: React.ReactNode
  onViewAutoTransfers: () => void
}

const COLUMNS: DataGridColumn<AutoCompleteRow>[] = [
  { key: "fromAccount", header: "출금계좌", align: "center" },
  { key: "toAccount", header: "입금계좌", align: "center" },
  { key: "payeeName", header: "받는분", align: "center", width: 90 },
  { key: "amount", header: "이체금액(원)", align: "right", width: 130 },
  { key: "period", header: "이체기간", align: "center", width: 190 },
  { key: "cycle", header: "이체주기", align: "center", width: 90 },
  { key: "dayOfMonth", header: "이체지정일", align: "center", width: 90 },
  {
    key: "nextExecDate",
    header: "다음 실행 예정일",
    align: "center",
    width: 130,
  },
]

/** G-03 자동이체 등록 3단계 · 완료 */
export const AutoTransferStep3 = ({
  steps,
  row,
  highlightAmount,
  onViewAutoTransfers,
}: AutoTransferStep3Props) => {
  return (
    <StepLayout steps={steps} currentStep={3} title="자동이체">
      <ResultPanel
        variant="success"
        message="자동이체 등록이 완료되었습니다."
        description="다음 실행 예정일에 첫 회차가 처리되며, 조회/변경/해지에서 등록 내용을 확인할 수 있습니다."
        highlightLabel="이체금액"
        highlightValue={highlightAmount}
        columns={COLUMNS}
        row={row}
        footnote="※ 출금계좌·입금계좌·이체지정일은 등록 후 변경할 수 없으며, 잔액과 1일 이체한도는 각 회차 실행 시점에 검증됩니다."
        actions={
          <Button
            variant="primary"
            size="lg"
            className="min-w-50"
            onClick={onViewAutoTransfers}
          >
            자동이체 조회/변경/해지
          </Button>
        }
      />
    </StepLayout>
  )
}
