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
  { key: "payeeName", header: "예금주", align: "center", width: 90 },
  { key: "amount", header: "이체금액(원)", align: "right", width: 130 },
  { key: "fee", header: "수수료(원)", align: "right", width: 100 },
  {
    // REQ-RSV-016 은 "통장 표시내용" 한 항목이다. 두 메모를 한 칸에 쌓는 것은
    // D-02 확인 화면과 같다 — 열을 둘로 나누면 표가 패널 폭을 넘는다.
    key: "memo",
    header: "통장 표시내용",
    align: "center",
    render: (row) => (
      <div className="flex flex-col gap-0.5 text-left text-xs">
        <span>받는 분 통장 {row.payeeMemo}</span>
        <span>내 통장 {row.myMemo}</span>
      </div>
    ),
  },
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
