import * as React from "react"
import {
  isConfirmedTransferStatus,
  type TransferResponseStatus,
} from "@/entities/transfer"
import { Button } from "@/shared/ui/button"
import { StepLayout } from "@/shared/ui/step-layout"

type InstantTransferStep3Props = {
  steps: string[]
  /** ResultPanel slot (delivered by a later chunk). */
  resultSlot?: React.ReactNode
  actionError?: string | null
  /**
   * 서버가 답한 이체 처리상태. 결과가 확정된 건에만 새 이체를 열어준다 — 미확정
   * 건에서 폼을 비워주면 고객이 같은 이체를 다시 넣어 두 번 입금될 수 있다
   * (corebank-server docs/phase2/interbank_transfer_fe_handoff.md §5-1).
   *
   * 허용 여부를 불리언으로 받지 않고 상태를 받아 여기서 판정한다. 버튼을 가진 쪽이
   * 판정하지 않으면 호출부의 전달 한 줄이 어긋나도 드러나지 않는다.
   */
  status?: TransferResponseStatus
  onNewTransfer: () => void
}

/** D-03 즉시이체 3단계 · 결과 */
export const InstantTransferStep3 = ({
  steps,
  actionError,
  resultSlot,
  status,
  onNewTransfer,
}: InstantTransferStep3Props) => {
  return (
    <StepLayout
      steps={steps}
      currentStep={3}
      title="즉시이체"
      footer={
        isConfirmedTransferStatus(status) ? (
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
