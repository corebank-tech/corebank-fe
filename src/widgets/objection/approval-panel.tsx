import * as React from "react"
import { UserCheck } from "lucide-react"
import {
  DECISION_LABEL,
  GATE_BRANCH_LABEL,
  labelOf,
  useApproveDecision,
  useReturnDecision,
  type ObjectionDecision,
} from "@/entities/payment-stop"
import { isApiError, toErrorMessage } from "@/shared/api/api-error"
import { formatAmount, formatDateTime } from "@/shared/lib/format"
import { useIdempotencyKey } from "@/shared/lib/hooks/use-idempotency-key"
import { Alert } from "@/shared/ui/alert"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Checkbox } from "@/shared/ui/checkbox"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { FormRow } from "@/shared/ui/form-row"
import { LabelValueRow } from "@/shared/ui/label-value-row"
import { Panel, PanelHeader } from "@/shared/ui/panel"
import { Textarea } from "@/shared/ui/textarea"

const MAX_RETURN_REASON_LENGTH = 500

/**
 * 다른 관리자가 먼저 처리했다는 뜻의 오류. 먼저 승인됐으면 `PST0302`(이미 확정), 먼저
 * 반려됐으면 `PST0204`(승인할 판정 없음)다. 상세를 다시 받으면 이 패널이 사라지므로 오류를
 * 패널 안에 두지 않고 화면으로 올린다.
 */
const SUPERSEDED_CODES = new Set(["PST0302", "PST0204"])

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
  /** 다른 관리자가 먼저 승인하거나 반려해 이번 요청이 거부됐을 때 */
  onSuperseded: () => void
}

/**
 * 2인 승인(계획 PA-10, 내부 통제 D33). 수용과 일부 지급정지는 작성한 관리자가 아닌 다른
 * 관리자가 승인해야 계좌에 반영된다.
 *
 * 작성자 본인은 승인만 막는다. 서버도 승인을 `PST0309` 로 거부한다 — 화면이 먼저 막는 이유는
 * 눌러서 거부를 받는 건 이미 늦기 때문이다. 로그인한 관리자 번호를 아직 모르면 해제를 막는
 * 쪽으로 두어 승인 버튼을 잠근다.
 *
 * 재량 판정(해제 요건 점검이 닫힌 판정을 작성자가 재량으로 쓴 것)이면 작성 당시 점검 갈래와
 * 재량 판정 사유를 보이고, 승인자가 "재량 판정 사유를 확인했습니다"를 체크해야 승인 버튼이
 * 열린다. 승인 요청에 `discretionaryAcknowledged: true` 를 싣는다. 빠지면 서버가 `PST0311` 로
 * 거부한다. 반려는 해제를 막는 쪽이라 체크 없이 할 수 있다.
 *
 * 반려는 작성자 본인도 할 수 있다(계약 v2 §10). 해제를 막는 쪽이라 잘못 올린 판정을 작성자가
 * 거둘 수 있어야 한다. 서버도 반려에는 작성자 검사를 두지 않는다.
 */
export const ApprovalPanel = ({
  objectionId,
  decision,
  canApprove,
  currentAdminId,
  onSettled,
  onSuperseded,
}: Props) => {
  const approve = useApproveDecision()
  const returnDecision = useReturnDecision()
  const approveKey = useIdempotencyKey()
  const returnKey = useIdempotencyKey()
  const [isConfirmOpen, setConfirmOpen] = React.useState(false)
  const [isReturnOpen, setReturnOpen] = React.useState(false)
  const [returnReason, setReturnReason] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isAcknowledged, setAcknowledged] = React.useState(false)

  const isAuthor =
    currentAdminId == null ||
    (decision.decidedBy != null && decision.decidedBy === currentAdminId)
  const approveBlockedReason = isAuthor
    ? currentAdminId == null
      ? "로그인한 관리자를 확인하는 중입니다."
      : "본인이 작성한 판정은 승인할 수 없습니다. 다른 승인 관리자가 승인합니다. 잘못 올렸으면 반려할 수 있습니다."
    : decision.discretionary && !isAcknowledged
      ? "재량 판정 사유를 확인했다고 체크해야 승인할 수 있습니다."
      : null
  const decisionId = decision.decisionId
  const isBusy = approve.isPending || returnDecision.isPending

  const handleError = (cause: unknown) => {
    if (isApiError(cause) && SUPERSEDED_CODES.has(cause.code)) {
      onSuperseded()
      return
    }
    setError(toErrorMessage(cause))
  }

  const handleApprove = () => {
    setConfirmOpen(false)
    if (decisionId == null) return
    setError(null)
    approve.mutate(
      {
        objectionId,
        decisionId,
        discretionaryAcknowledged: decision.discretionary && isAcknowledged,
        idempotencyKey: approveKey.keyFor({ objectionId, decisionId }),
      },
      {
        onSuccess: (approved) => {
          approveKey.reset()
          onSettled("APPROVED", approved)
        },
        onError: handleError,
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
        onError: handleError,
      },
    )
  }

  return (
    <Panel aria-label="승인 대기 판정">
      <PanelHeader
        title="승인 대기 판정"
        action={
          <span className="inline-flex gap-1">
            {decision.discretionary && (
              <Badge variant="danger">재량 판정</Badge>
            )}
            <Badge variant="warning">승인 대기</Badge>
          </span>
        }
      />
      {decision.discretionary && (
        <div className="px-4 pb-3">
          <Alert variant="warning" title="해제 요건 점검과 다른 재량 판정">
            해제 요건 점검이 닫힌 판정을 작성자가 재량으로 썼습니다. 재량 판정
            사유를 확인하고 승인하세요.
          </Alert>
        </div>
      )}
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
      {decision.discretionary && (
        <>
          <LabelValueRow
            label="작성 당시 점검"
            value={
              decision.gateBranchAtWrite
                ? labelOf(GATE_BRANCH_LABEL, decision.gateBranchAtWrite)
                : "-"
            }
            labelWidth={140}
          />
          <LabelValueRow
            label="재량 판정 사유"
            value={
              <span className="whitespace-pre-wrap">
                {decision.discretionaryReason ?? "-"}
              </span>
            }
            labelWidth={140}
          />
        </>
      )}
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
            {decision.discretionary && !isAuthor && (
              <Checkbox
                label="재량 판정 사유를 확인했습니다"
                checked={isAcknowledged}
                disabled={isBusy}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
            )}
            {approveBlockedReason && (
              <Alert variant="warning">{approveBlockedReason}</Alert>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={approveBlockedReason != null || isBusy}
                onClick={() => setConfirmOpen(true)}
              >
                <UserCheck className="h-3.5 w-3.5" aria-hidden />
                승인
              </Button>
              <Button
                size="sm"
                variant="outline"
                aria-expanded={isReturnOpen}
                disabled={isBusy}
                onClick={() => setReturnOpen((open) => !open)}
              >
                반려
              </Button>
            </div>
            {isReturnOpen && (
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
        title={decision.discretionary ? "재량 판정 승인" : "판정 승인"}
        messages={[
          decision.discretionary
            ? "해제 요건 점검과 다른 아래 재량 판정을 승인합니다."
            : "아래 판정을 승인합니다.",
          "승인하면 계좌의 지급정지에 바로 반영되고 되돌릴 수 없습니다.",
        ]}
        items={[
          { label: "이의제기 번호", value: objectionId },
          {
            label: "판정",
            value: decision.discretionary
              ? `${labelOf(DECISION_LABEL, decision.result)} (재량 판정)`
              : labelOf(DECISION_LABEL, decision.result),
          },
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
