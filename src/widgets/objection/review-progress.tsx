import * as React from "react"
import { ClipboardCheck } from "lucide-react"
import {
  OBJECTION_STATUS_LABEL,
  SUPPLEMENT_MAX_ROUNDS,
  labelOf,
  useConfirmCompleteness,
  type ObjectionDetail,
} from "@/entities/payment-stop"
import { DeadlineCountdown } from "@/widgets/objection/deadline-countdown"
import { SupplementRequestForm } from "@/widgets/objection/supplement-request-form"
import { toErrorMessage } from "@/shared/api/api-error"
import { useIdempotencyKey } from "@/shared/lib/hooks/use-idempotency-key"
import { Alert } from "@/shared/ui/alert"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Panel, PanelHeader } from "@/shared/ui/panel"

type Props = {
  objection: Pick<
    ObjectionDetail,
    | "objectionId"
    | "objectionStatus"
    | "reviewDeadline"
    | "deadlineAlert"
    | "supplementDue"
    | "supplementRound"
    | "supplementOverdue"
  >
  /** 변경 권한(`PAYMENT_STOP_WRITE`). 없으면 완비 확인과 보완 요청을 그리지 않는다 */
  canWrite: boolean
  /** 보완 요청 서류의 처음 값 */
  suggestedDocuments?: string[]
}

/** 소명 완비 확인을 받는 상태(계약 v2 §3). */
const COMPLETENESS_STATUSES = new Set(["RECEIVED", "SUPPLEMENT_SUBMITTED"])
/** 보완 요청을 받는 상태. 보완 중이거나 판정이 올라간 뒤에는 요청하지 않는다. */
const SUPPLEMENT_STATUSES = new Set([
  "RECEIVED",
  "UNDER_REVIEW",
  "SUPPLEMENT_SUBMITTED",
])

/**
 * 심사 진행(계획 PA-10). 심사 기한과 보완 기한, 보완 회차, 소명 완비 확인과 보완 요청.
 *
 * 심사 기한은 소명 완비를 확인한 날부터 5영업일이다(D12). 보완 기한이 지나도 자동으로 불수용을
 * 확정하지 않는다(D32). 담당자가 "불수용 대상" 표시를 보고 판정한다.
 */
export const ReviewProgress = ({
  objection,
  canWrite,
  suggestedDocuments,
}: Props) => {
  const confirmCompleteness = useConfirmCompleteness()
  const idempotency = useIdempotencyKey()
  const [error, setError] = React.useState<string | null>(null)
  const [isSupplementOpen, setSupplementOpen] = React.useState(false)

  const { objectionId, objectionStatus } = objection
  const canConfirm = canWrite && COMPLETENESS_STATUSES.has(objectionStatus)
  const canSupplement = canWrite && SUPPLEMENT_STATUSES.has(objectionStatus)
  const isSupplementPending = objectionStatus === "SUPPLEMENT_REQUESTED"

  const handleConfirm = () => {
    setError(null)
    confirmCompleteness.mutate(
      {
        objectionId,
        idempotencyKey: idempotency.keyFor({ objectionId, objectionStatus }),
      },
      {
        onSuccess: () => idempotency.reset(),
        onError: (cause) => setError(toErrorMessage(cause)),
      },
    )
  }

  return (
    <Panel aria-label="심사 진행">
      <PanelHeader
        title="심사 진행"
        action={
          <span className="inline-flex gap-1">
            <Badge variant="primary">
              {labelOf(OBJECTION_STATUS_LABEL, objectionStatus)}
            </Badge>
            {objection.supplementOverdue && (
              <Badge variant="danger">불수용 대상</Badge>
            )}
          </span>
        }
      />
      <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <DeadlineCountdown
            label="심사 기한"
            deadline={objection.reviewDeadline}
            alert={objection.deadlineAlert}
            pendingText="소명 완비 확인 뒤 정해집니다"
          />
          {objection.supplementRound > 0 && (
            <span className="text-xs text-ink-muted">
              보완 {objection.supplementRound}회 / 최대 {SUPPLEMENT_MAX_ROUNDS}
              회
            </span>
          )}
          {isSupplementPending && (
            <DeadlineCountdown
              label="보완 기한"
              deadline={objection.supplementDue}
              alert={objection.supplementOverdue}
            />
          )}
        </div>

        {objection.deadlineAlert && (
          <Alert variant="danger" title="심사 기한 임박">
            심사 기한 하루 전입니다. 기한 안에 판정을 확정하거나 보완을
            요청하세요.
          </Alert>
        )}
        {objection.supplementOverdue && (
          <Alert variant="warning" title="보완 기한 경과">
            보완 자료가 기한까지 오지 않아 불수용 대상입니다. 자동으로 확정하지
            않으니 담당자가 판정해야 합니다.
          </Alert>
        )}
        {error && <Alert variant="danger">{error}</Alert>}

        {(canConfirm || canSupplement) && (
          <div className="flex flex-wrap gap-2">
            {canConfirm && (
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={confirmCompleteness.isPending}
              >
                <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
                {confirmCompleteness.isPending ? "확인 중" : "소명 완비 확인"}
              </Button>
            )}
            {canSupplement && (
              <Button
                size="sm"
                variant="outline"
                aria-expanded={isSupplementOpen}
                onClick={() => setSupplementOpen((open) => !open)}
              >
                보완 요청 작성
              </Button>
            )}
          </div>
        )}
        {canSupplement && isSupplementOpen && (
          <SupplementRequestForm
            objectionId={objectionId}
            supplementRound={objection.supplementRound}
            suggestedDocuments={suggestedDocuments}
          />
        )}
      </div>
    </Panel>
  )
}
