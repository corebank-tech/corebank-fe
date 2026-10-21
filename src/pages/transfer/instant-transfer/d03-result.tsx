import * as React from "react"
import { Button } from "@/shared/ui/button"
import { StepLayout } from "@/shared/ui/step-layout"

type InstantTransferStep3Props = {
  steps: string[]
  /** ResultPanel slot (delivered by a later chunk). */
  resultSlot?: React.ReactNode
  actionError?: string | null
  /**
   * 결과가 확정된 건만 새 이체를 열어준다. 미확정 건에서 폼을 비워주면 고객이
   * 같은 이체를 다시 넣어 이중 출금이 날 수 있다(REQ-TRSF-017).
   */
  canStartNewTransfer: boolean
  onNewTransfer: () => void
}

/** D-03 즉시이체 3단계 · 결과 */
export const InstantTransferStep3 = ({
  steps,
  actionError,
  resultSlot,
  canStartNewTransfer,
  onNewTransfer,
}: InstantTransferStep3Props) => {
  return (
    <StepLayout
      steps={steps}
      currentStep={3}
      title="즉시이체"
      footer={
        canStartNewTransfer ? (
          <Button
            variant="primary"
            size="lg"
            className="min-w-40"
            onClick={onNewTransfer}
          >
            새 이체하기
          </Button>
        ) : null
      }
    >
      {actionError != null && (
        <p role="alert" className="mb-3 text-base font-bold text-danger">
          {actionError}
        </p>
      )}
      {resultSlot ?? (
        <div className="flex min-h-[160px] items-center justify-center border border-dashed border-border-strong bg-surface px-4 py-10 text-base text-ink-muted">
          이체 결과 영역
        </div>
      )}
    </StepLayout>
  )
}
