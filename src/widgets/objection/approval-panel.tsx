import * as React from "react"
import { UserCheck } from "lucide-react"
import {
  DECISION_LABEL,
  labelOf,
  useApproveDecision,
  useReturnDecision,
  type ObjectionDecision,
} from "@/entities/payment-stop"
import { toErrorMessage } from "@/shared/api/api-error"
import { formatAmount, formatDateTime } from "@/shared/lib/format"
import { useIdempotencyKey } from "@/shared/lib/hooks/use-idempotency-key"
import { Alert } from "@/shared/ui/alert"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { FormRow } from "@/shared/ui/form-row"
import { LabelValueRow } from "@/shared/ui/label-value-row"
import { Panel, PanelHeader } from "@/shared/ui/panel"
import { Textarea } from "@/shared/ui/textarea"

const MAX_RETURN_REASON_LENGTH = 500

type Props = {
  objectionId: number
  decision: ObjectionDecision
  /** 승인 권한(`PAYMENT_STOP_APPROVE`) */
  canApprove: boolean
  /** 지금 로그인한 관리자의 고객 번호. 모르면 `null` 이고 그동안 승인을 막는다 */
  currentAdminId: number | null
  /** 승인이나 반려가 끝났을 때. 화면이 결과 안내를 띄운다 */
  onSettled: (
    outcome: "APPROVED" | "RETURNED",
    decision: ObjectionDecision,
  ) => void
}

/**
 * 2인 승인(계획 PA-10, 내부 통제 D33). 수용과 일부 지급정지는 작성한 관리자가 아닌 다른
 * 관리자가 승인해야 계좌에 반영된다.
 *
 * 작성자 본인은 승인과 반려를 모두 막는다. 서버도 승인을 `PST0309` 로 거부한다 — 화면이 먼저
 * 막는 이유는 눌러서 거부를 받는 건 이미 늦기 때문이다. 로그인한 관리자 번호를 아직 모르면
 * 해제를 막는 쪽으로 두어 버튼을 잠근다.
 */
export const ApprovalPanel = ({
  objectionId,
  decision,
  canApprove,
  currentAdminId,
  onSettled,
}: Props) => {
  const approve = useApproveDecision()
  const returnDecision = useReturnDecision()
  const approveKey = useIdempotencyKey()
  const returnKey = useIdempotencyKey()
  const [isConfirmOpen, setConfirmOpen] = React.useState(false)
  const [isReturnOpen, setReturnOpen] = React.useState(false)
  const [returnReason, setReturnReason] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const isAuthor =
    currentAdminId == null ||
    (decision.decidedBy != null && decision.decidedBy === currentAdminId)
  const blockedReason = isAuthor
    ? currentAdminId == null
      ? "로그인한 관리자를 확인하는 중입니다."
      : "본인이 작성한 판정은 승인하거나 반려할 수 없습니다. 다른 승인 관리자가 처리합니다."
    : null
  const decisionId = decision.decisionId
  const isBusy = approve.isPending || returnDecision.isPending

  const handleApprove = () => {
    setConfirmOpen(false)
    if (decisionId == null) return
    setError(null)
    approve.mutate(
      {
        objectionId,
        decisionId,
        idempotencyKey: approveKey.keyFor({ objectionId, decisionId }),
      },
      {
        onSuccess: (approved) => {
          approveKey.reset()
          onSettled("APPROVED", approved)
        },
        onError: (cause) => setError(toErrorMessage(cause)),
      },
    )
  }

  const handleReturn = (event: React.FormEvent) => {
    event.preventDefault()
    if (decisionId == null) return
    const reason = returnReason.trim()
    if (reason === "") {
      setError("반려 사유를 입력하세요.")
      return
    }
    setError(null)
    returnDecision.mutate(
      {
        objectionId,
        decisionId,
        reason,
        idempotencyKey: returnKey.keyFor({ objectionId, decisionId, reason }),
      },
      {
        onSuccess: (returned) => {
          returnKey.reset()
          onSettled("RETURNED", returned)
        },
        onError: (cause) => setError(toErrorMessage(cause)),
      },
    )
  }

  return (
    <Panel aria-label="승인 대기 판정">
      <PanelHeader
        title="승인 대기 판정"
        action={<Badge variant="warning">승인 대기</Badge>}
      />
      <LabelValueRow
        label="판정"
        value={labelOf(DECISION_LABEL, decision.result)}
        labelWidth={140}
      />
      <LabelValueRow
        label="판정 사유"
        value={<span className="whitespace-pre-wrap">{decision.reason}</span>}
        labelWidth={140}
      />
      <LabelValueRow
        label="조기 해제 근거"
        value={decision.earlyReleaseBasis ?? "-"}
        labelWidth={140}
      />
      {decision.result === "PARTIAL" && (
        <LabelValueRow
          label="요청 보류액"
          value={
            decision.requestedHoldAmount != null
              ? formatAmount(decision.requestedHoldAmount)
              : "-"
          }
          labelWidth={140}
        />
      )}
      <LabelValueRow
        label="작성자"
        value={
          decision.decidedBy != null
            ? `관리자 번호 ${decision.decidedBy}${decision.decidedBy === currentAdminId ? " (본인)" : ""}`
            : "-"
        }
        labelWidth={140}
      />
      <LabelValueRow
        label="작성 일시"
        value={decision.decidedAt ? formatDateTime(decision.decidedAt) : "-"}
        labelWidth={140}
      />
      <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
        <p className="text-xs text-ink-muted">
          승인되기 전까지 계좌의 지급정지는 바뀌지 않습니다. 승인 직전에 서버가
          해제 요건을 다시 계산합니다.
        </p>
        {!canApprove ? (
          <Alert variant="info" title="승인 권한 없음">
            승인과 반려는 지급정지 승인 권한이 있는 다른 관리자가 합니다.
          </Alert>
        ) : (
          <>
            {blockedReason && <Alert variant="warning">{blockedReason}</Alert>}
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={blockedReason != null || isBusy}
                onClick={() => setConfirmOpen(true)}
              >
                <UserCheck className="h-3.5 w-3.5" aria-hidden />
                승인
              </Button>
              <Button
                size="sm"
                variant="outline"
                aria-expanded={isReturnOpen}
                disabled={blockedReason != null || isBusy}
                onClick={() => setReturnOpen((open) => !open)}
              >
                반려
              </Button>
            </div>
            {isReturnOpen && blockedReason == null && (
              <form onSubmit={handleReturn} noValidate aria-label="반려">
                <FormRow
                  label="반려 사유"
                  htmlFor="adm-decision-return-reason"
                  required
                >
                  <Textarea
                    id="adm-decision-return-reason"
                    maxLength={MAX_RETURN_REASON_LENGTH}
                    value={returnReason}
                    onChange={(event) => setReturnReason(event.target.value)}
                  />
                </FormRow>
                <div className="mt-2 flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    variant="danger"
                    disabled={isBusy}
                  >
                    반려 확정
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
        {error && <Alert variant="danger">{error}</Alert>}
      </div>
      <ConfirmDialog
        open={isConfirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleApprove}
        title="판정 승인"
        messages={[
          "아래 판정을 승인합니다.",
          "승인하면 계좌의 지급정지에 바로 반영되고 되돌릴 수 없습니다.",
        ]}
        items={[
          { label: "이의제기 번호", value: objectionId },
          { label: "판정", value: labelOf(DECISION_LABEL, decision.result) },
          {
            label: "작성자",
            value:
              decision.decidedBy != null
                ? `관리자 번호 ${decision.decidedBy}`
                : "-",
          },
        ]}
      />
    </Panel>
  )
}
