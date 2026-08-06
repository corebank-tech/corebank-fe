import * as React from "react"
import { Button } from "@/shared/ui/button"
import { StepLayout } from "@/shared/ui/step-layout"

type InstantTransferStep3Props = {
  steps: string[]
  /** ResultPanel slot (delivered by a later chunk). */
  resultSlot?: React.ReactNode
  onNewTransfer: () => void
}

/** D-03 즉시이체 3단계 · 결과 */
export const InstantTransferStep3 = ({
  steps,
  resultSlot,
  onNewTransfer,
}: InstantTransferStep3Props) => {
  return (
    <StepLayout
      steps={steps}
      currentStep={3}
      title="즉시이체"
      footer={
        <Button
          variant="primary"
          size="lg"
          className="min-w-40"
          onClick={onNewTransfer}
        >
          새 이체하기
        </Button>
      }
    >
      {resultSlot ?? (
        <div className="flex min-h-[160px] items-center justify-center border border-dashed border-border-strong bg-surface px-4 py-10 text-base text-ink-muted">
          이체 결과 영역
        </div>
      )}
    </StepLayout>
  )
}
