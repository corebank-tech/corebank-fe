import * as React from "react"
import { ClipboardCheck } from "lucide-react"
import {
  OBJECTION_STATUS_LABEL,
  SUPPLEMENT_MAX_ROUNDS,
  businessDaysUntil,
  labelOf,
  useConfirmCompleteness,
  type ObjectionDetail,
} from "@/entities/payment-stop"
import { DeadlineCountdown } from "@/widgets/objection/deadline-countdown"
import {
  SupplementRequestForm,
  type SupplementRequested,
} from "@/widgets/objection/supplement-request-form"
import { toErrorMessage } from "@/shared/api/api-error"
import { getToday } from "@/shared/config/clock"
import { formatDate } from "@/shared/lib/format"
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
  /** 오늘 날짜. 테스트가 고정한다 */
  today?: string
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
 * 심사 기한 경보 문구. 서버 `deadlineAlert` 는 확정 전이고 기한 1영업일 전부터 켜지며, 기한
 * 당일과 지난 뒤에도 켜져 있다. 그래서 남은 날과 상태로 문구를 가른다. 남은 날은 화면이
 * 주말만 빼고 센 안내값이다(공휴일은 서버만 안다).
 */
const deadlineAlertText = (
  status: string,
  deadline: string | null,
  today: string,
) => {
  const days = deadline == null ? 1 : businessDaysUntil(today, deadline)
  const title = days < 0 ? "심사 기한 경과" : "심사 기한 임박"
  const when =
    days < 0
      ? "심사 기한이 지났습니다."
      : days === 0
        ? "오늘이 심사 기한입니다."
        : "심사 기한이 다음 영업일입니다."
  const action =
    status === "PENDING_APPROVAL"
      ? "승인 관리자가 승인 대기 판정을 승인하거나 반려해야 합니다."
      : SUPPLEMENT_STATUSES.has(status)
        ? "판정을 확정하거나 보완을 요청하세요."
        : "판정을 확정하세요."
  return { title, message: `${when} ${action}` }
}

/**
 * 심사 진행(계획 PA-10). 심사 기한과 보완 기한, 보완 회차, 소명 완비 확인과 보완 요청.
 *
 * 심사 기한은 소명 완비를 확인한 날부터 5영업일이다(D12). 보완 기한이 지나도 자동으로 불수용을
 * 확정하지 않는다(D32). 담당자가 "불수용 대상" 표시를 보고 판정한다.
 *
 * 결과와 오류 안내는 이 패널이 들고 있다. 보완 요청이 받아들여지면 다시 받은 상세가 보완 요청
 * 상태가 되어 입력 폼이 사라지는데, 안내까지 폼 안에 두면 함께 사라진다. 오류는 그 오류를 받은
 * 때의 상태와 함께 기억해, 동료가 먼저 처리해 상태가 바뀌면 지난 오류를 보이지 않는다.
 */
export const ReviewProgress = ({
  objection,
  canWrite,
  suggestedDocuments,
  today = getToday(),
}: Props) => {
  const confirmCompleteness = useConfirmCompleteness()
  const idempotency = useIdempotencyKey()
  const [error, setError] = React.useState<{
    message: string | null
    status: string
  } | null>(null)
  const [requested, setRequested] = React.useState<SupplementRequested | null>(
    null,
  )
  const [isSupplementOpen, setSupplementOpen] = React.useState(false)

  const { objectionId, objectionStatus } = objection
  const canConfirm = canWrite && COMPLETENESS_STATUSES.has(objectionStatus)
  const canSupplement = canWrite && SUPPLEMENT_STATUSES.has(objectionStatus)
  const isSupplementPending = objectionStatus === "SUPPLEMENT_REQUESTED"
  const visibleError =
    error != null && error.status === objectionStatus ? error.message : null
  const alertText = deadlineAlertText(
    objectionStatus,
    objection.reviewDeadline,
    today,
  )

  const handleConfirm = () => {
    setError(null)
    setRequested(null)
    confirmCompleteness.mutate(
      {
        objectionId,
        idempotencyKey: idempotency.keyFor({ objectionId, objectionStatus }),
      },
      {
        onSuccess: () => idempotency.reset(),
        onError: (cause) =>
          setError({ message: toErrorMessage(cause), status: objectionStatus }),
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
          <Alert variant="danger" title={alertText.title}>
            {alertText.message}
          </Alert>
        )}
        {objection.supplementOverdue && (
          <Alert variant="warning" title="보완 기한 경과">
            보완 자료가 기한까지 오지 않아 불수용 대상입니다. 자동으로 확정하지
            않으니 담당자가 판정해야 합니다.
          </Alert>
        )}
        {visibleError && <Alert variant="danger">{visibleError}</Alert>}
        {requested && (
          <Alert variant="success">
            {requested.round}회째 보완을 요청했습니다.
            {requested.due &&
              ` 보완 기한은 ${formatDate(requested.due)}입니다.`}{" "}
            명의인 통지를 기록했습니다.
          </Alert>
        )}

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
            onRequested={(result) => {
              setRequested(result)
              setSupplementOpen(false)
            }}
          />
        )}
      </div>
    </Panel>
  )
}
