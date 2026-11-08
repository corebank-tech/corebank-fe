import * as React from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import { hasPermission } from "@/entities/auth"
import { useCustomerProfileQuery } from "@/entities/customer"
import { useSession } from "@/features/session"
import {
  AccessReasonSelect,
  isAccessReason,
  type AccessReason,
} from "@/entities/admin-customer"
import {
  CASE_STATUS_LABEL,
  CLAUSE_SCOPE,
  DECISION_LABEL,
  OBJECTION_STATUS_LABEL,
  RECEIVED_CHANNEL_LABEL,
  formatClause,
  isObjectionOpen,
  labelOf,
  useAgentRuns,
  useObjectionDetail,
  useReviewDraft,
  useStartReviewSession,
  type DecisionResult,
  type DisputedTransfer,
  type ObjectionClause,
  type ObjectionDecision,
} from "@/entities/payment-stop"
import {
  AgentAnalysis,
  ApprovalPanel,
  DocumentEvidence,
  ExternalCheckPanel,
  GateChecklist,
  LedgerEvidence,
  NoticeList,
  ReviewProgress,
} from "@/widgets/objection"
import { useIdempotencyKey } from "@/shared/lib/hooks/use-idempotency-key"
import { toErrorMessage } from "@/shared/api/api-error"
import { formatAmount, formatDate, formatDateTime } from "@/shared/lib/format"
import { Alert } from "@/shared/ui/alert"
import { Badge, type BadgeVariant } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { EmptyState } from "@/shared/ui/empty-state"
import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import { LabelValueRow } from "@/shared/ui/label-value-row"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { Panel, PanelHeader } from "@/shared/ui/panel"
import { Adm05ObjectionDecisionForm } from "@/pages/admin/adm05-objection-decision-form"

/**
 * ADM-05 지급정지 이의제기 심사 — 상세와 판정 확정.
 *
 * 위에서 아래로 담당자가 판단하는 순서대로 놓는다: 사건, 심사 진행(기한, 완비 확인, 보완, 외부
 * 확인), 다툼 거래, 명의인 소명, 첨부 서류, AI 분석(참고), 주장 대 원장 대조와 원장 타임라인,
 * 해제 요건 점검(서버 규칙), 판정(작성과 2인 승인), 통지 기록. 판정은 이 화면에 머문 채 끝나므로
 * ADM-01 처럼 화면을 넘기지 않고 확인 다이얼로그 뒤 결과를 같은 화면에 보인다.
 *
 * 상세를 처음 열 때 심사 시작 시각을 서버에 남긴다(처리시간 평가용). 실패해도 화면과 무관하다.
 *
 * 조회 사유(PH-89)는 ADM-01 과 같이 주소의 `?reason=` 으로 받는다. 목록 응답에는 소명
 * 원문이 없어 목록은 사유를 묻지 않으므로, 상세는 처음 열 때 항상 사유부터 고르게 한다.
 */

const CASE_STATUS_TONE: Record<string, BadgeVariant> = {
  STOPPED: "danger",
  PARTIAL: "warning",
  RELEASED: "success",
}

const DECISION_TONE: Record<string, BadgeVariant> = {
  ACCEPTED: "success",
  PARTIAL: "warning",
  REJECTED: "danger",
}

const BACK_LINK_CLASS =
  "text-base text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"

const disputedColumns: DataGridColumn<DisputedTransfer>[] = [
  {
    key: "transactionNumber",
    header: "거래 번호",
    align: "center",
    render: (row) => row.transactionNumber,
  },
  {
    key: "amount",
    header: "입금액",
    align: "right",
    width: 150,
    render: (row) => formatAmount(row.amount),
  },
  {
    key: "occurredAt",
    header: "거래 일시",
    align: "center",
    width: 180,
    render: (row) => (row.occurredAt ? formatDateTime(row.occurredAt) : "-"),
  },
  {
    key: "evidence",
    header: "판단 근거",
    align: "center",
    width: 130,
    // 다툼 거래는 그 자체로 정상 근거가 될 수 없다(근거 제외 규칙).
    render: () => <Badge variant="warning">판단 근거 아님</Badge>,
  },
]

/** 사유 없이 상세를 연 경우. 고르면 주소에 실어 새로고침해도 유지한다. */
const AccessReasonGate = ({
  onSelect,
}: {
  onSelect: (reason: AccessReason) => void
}) => {
  const [reason, setReason] = React.useState<AccessReason | null>(null)
  return (
    <Panel>
      <PanelHeader title="조회 사유" />
      <div className="flex flex-col gap-3 px-4 pt-1 pb-4">
        <p className="text-base text-ink">
          명의인 소명 원문을 열기 전에 조회 사유를 고르세요. 사유는 감사 기록에
          남습니다.
        </p>
        <FormRow
          label="조회 사유"
          htmlFor="adm-objection-access-reason"
          required
        >
          <AccessReasonSelect
            id="adm-objection-access-reason"
            value={reason}
            onChange={setReason}
          />
        </FormRow>
        <div>
          <Button
            disabled={reason == null}
            onClick={() => reason && onSelect(reason)}
          >
            확인
          </Button>
        </div>
      </div>
    </Panel>
  )
}

const yesNo = (value: boolean) => (value ? "예" : "아니오")

/** 판정 작성, 승인, 반려 뒤 화면 위에 띄우는 안내. */
type Outcome =
  | { kind: "CONFIRMED"; result: DecisionResult }
  | { kind: "PENDING"; result: DecisionResult }
  | { kind: "APPROVED"; result: string }
  | { kind: "RETURNED"; result: string; reason: string | null }
  | { kind: "SUPERSEDED" }

const OutcomeAlert = ({ outcome }: { outcome: Outcome }) => {
  if (outcome.kind === "SUPERSEDED") {
    return (
      <Alert variant="warning" title="이미 처리된 판정">
        다른 관리자가 먼저 승인하거나 반려했습니다. 아래에 다시 받은 최신 상태를
        확인하세요.
      </Alert>
    )
  }
  const label = labelOf(DECISION_LABEL, outcome.result)
  if (outcome.kind === "PENDING") {
    return (
      <Alert variant="info" title="승인 대기">
        {label} 판정을 승인 대기로 올렸습니다. 다른 관리자가 승인하면 계좌에
        반영됩니다.
      </Alert>
    )
  }
  if (outcome.kind === "RETURNED") {
    return (
      <Alert variant="warning" title="판정 반려">
        {label} 판정을 반려했습니다. 이의제기는 심사 중으로 돌아갑니다.
        {outcome.reason && ` 반려 사유: ${outcome.reason}`}
      </Alert>
    )
  }
  return (
    <Alert variant="success">
      {label} 판정을 {outcome.kind === "APPROVED" ? "승인해 " : ""}확정했습니다.
      지급정지 상태에 반영됐습니다.
    </Alert>
  )
}

const ConfirmedDecision = ({ decision }: { decision: ObjectionDecision }) => (
  <Panel>
    <PanelHeader
      title="확정된 판정"
      action={
        <Badge variant={DECISION_TONE[decision.result] ?? "neutral"}>
          {labelOf(DECISION_LABEL, decision.result)}
        </Badge>
      }
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
      <>
        <LabelValueRow
          label="요청 보류액"
          value={
            decision.requestedHoldAmount != null
              ? formatAmount(decision.requestedHoldAmount)
              : "-"
          }
          labelWidth={140}
        />
        <LabelValueRow
          label="적용 보류액"
          value={
            decision.appliedHoldAmount != null
              ? formatAmount(decision.appliedHoldAmount)
              : "-"
          }
          labelWidth={140}
        />
      </>
    )}
    <LabelValueRow
      label={decision.approvedBy != null ? "작성자" : "확정자"}
      value={
        decision.decidedBy != null ? `관리자 번호 ${decision.decidedBy}` : "-"
      }
      labelWidth={140}
    />
    <LabelValueRow
      label={decision.approvedBy != null ? "작성 일시" : "확정 일시"}
      value={decision.decidedAt ? formatDateTime(decision.decidedAt) : "-"}
      labelWidth={140}
    />
    {decision.approvedBy != null && (
      <>
        <LabelValueRow
          label="승인자"
          value={`관리자 번호 ${decision.approvedBy}`}
          labelWidth={140}
        />
        <LabelValueRow
          label="승인 일시"
          value={
            decision.approvedAt ? formatDateTime(decision.approvedAt) : "-"
          }
          labelWidth={140}
        />
      </>
    )}
  </Panel>
)

/**
 * 상세를 연 시각을 서버에 한 번 남긴다(계약 v2 `review-sessions`). 처리시간 평가용이라 실패는
 * 무시한다. 같은 화면이 다시 그려져도 한 번만 보낸다.
 */
const useReviewSessionOnOpen = (objectionId: number, isReady: boolean) => {
  const startSession = useStartReviewSession()
  const idempotency = useIdempotencyKey()
  const startedRef = React.useRef<number | null>(null)
  const { mutate } = startSession
  React.useEffect(() => {
    if (!isReady || startedRef.current === objectionId) return
    startedRef.current = objectionId
    mutate(
      { objectionId, idempotencyKey: idempotency.keyFor({ objectionId }) },
      { onError: () => {} },
    )
  }, [idempotency, isReady, mutate, objectionId])
}

export const Adm05ObjectionDetail = () => {
  const { objectionId } = useParams()
  const navigate = useNavigate()
  const { permissions } = useSession()
  const canDecide = hasPermission(permissions, "PAYMENT_STOP_WRITE")
  const canApprove = hasPermission(permissions, "PAYMENT_STOP_APPROVE")
  // 판정 작성자와 같은 사람인지 가르는 번호. 세션 복원이 받은 프로필을 그대로 쓴다.
  const profile = useCustomerProfileQuery()
  const currentAdminId = profile.data?.customerId ?? null

  const [searchParams, setSearchParams] = useSearchParams()
  const reasonParam = searchParams.get("reason")
  const reason = isAccessReason(reasonParam) ? reasonParam : null

  const parsedId = Number(objectionId)
  const { objection, isPending, isError, error } = useObjectionDetail(
    parsedId,
    reason,
  )
  const [outcome, setOutcome] = React.useState<Outcome | null>(null)
  const isValidObjection = Number.isInteger(parsedId) && parsedId > 0
  useReviewSessionOnOpen(parsedId, isValidObjection && objection != null)
  const { latestRun } = useAgentRuns(parsedId, isValidObjection)
  const { draft } = useReviewDraft(parsedId, latestRun)

  const backLink = (
    <div>
      <Link to="/admin/objections" className={BACK_LINK_CLASS}>
        ← 이의제기 목록
      </Link>
    </div>
  )

  // 주소가 숫자가 아니면 조회를 걸지 않아 isPending 이 풀리지 않는다.
  // 그 경우는 로딩이 아니라 "찾을 수 없음"으로 보낸다.
  const isValidId = Number.isInteger(parsedId) && parsedId > 0
  if (isValidId && reason == null) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <AccessReasonGate
          onSelect={(selected) => setSearchParams({ reason: selected })}
        />
      </div>
    )
  }

  if (isValidId && isPending) {
    return (
      <Panel>
        <p className="px-4 py-6 text-base text-ink-muted">불러오는 중…</p>
      </Panel>
    )
  }

  if (!objection) {
    return (
      <Panel>
        <EmptyState
          message="이의제기를 찾을 수 없습니다"
          description={
            (isError && toErrorMessage(error)) || "목록에서 다시 선택해 주세요."
          }
          action={
            <Button onClick={() => navigate("/admin/objections")}>
              이의제기 목록으로
            </Button>
          }
        />
      </Panel>
    )
  }

  const disputedTotal = objection.disputedTransfers.reduce(
    (sum, transfer) => sum + transfer.amount,
    0,
  )
  const scope = CLAUSE_SCOPE[objection.clause as ObjectionClause]
  const pending = objection.pendingDecision
  const canWriteDecision =
    objection.decision == null &&
    pending == null &&
    isObjectionOpen(objection.objectionStatus)

  return (
    <div className="flex flex-col gap-6">
      {backLink}

      {outcome != null && <OutcomeAlert outcome={outcome} />}

      <Panel>
        <PanelHeader
          title="사건 정보"
          action={
            <span className="inline-flex gap-1">
              <Badge
                variant={CASE_STATUS_TONE[objection.caseStatus] ?? "neutral"}
              >
                {labelOf(CASE_STATUS_LABEL, objection.caseStatus)}
              </Badge>
              <Badge
                variant={
                  objection.objectionStatus === "DECIDED"
                    ? "neutral"
                    : objection.objectionStatus === "PENDING_APPROVAL"
                      ? "warning"
                      : "primary"
                }
              >
                {labelOf(OBJECTION_STATUS_LABEL, objection.objectionStatus)}
              </Badge>
            </span>
          }
        />
        <div className="grid grid-cols-2 border-t border-border">
          <LabelValueRow
            label="이의제기 번호"
            value={objection.objectionId}
            labelWidth={140}
          />
          <LabelValueRow
            label="사건 번호"
            value={objection.caseId}
            labelWidth={140}
          />
          <LabelValueRow
            label="계좌 ID"
            value={objection.accountId}
            labelWidth={140}
          />
          <LabelValueRow
            label="송금인 계좌 ID"
            value={objection.senderAccountId ?? "타행 송금"}
            labelWidth={140}
          />
          <LabelValueRow
            label="신청 기한"
            value={
              objection.objectionDeadline
                ? formatDate(objection.objectionDeadline)
                : "-"
            }
            labelWidth={140}
          />
          <LabelValueRow
            label="접수 일시"
            value={
              objection.receivedAt ? formatDateTime(objection.receivedAt) : "-"
            }
            labelWidth={140}
          />
          <LabelValueRow
            label="접수 경로"
            value={
              objection.receivedChannel
                ? labelOf(RECEIVED_CHANNEL_LABEL, objection.receivedChannel)
                : "-"
            }
            labelWidth={140}
          />
          <LabelValueRow
            label="완비 확인 일시"
            value={
              objection.completenessConfirmedAt
                ? formatDateTime(objection.completenessConfirmedAt)
                : "확인 전"
            }
            labelWidth={140}
          />
        </div>
      </Panel>

      <FormSection title="심사 진행" className="mb-0">
        <div className="flex flex-col gap-4">
          <ReviewProgress
            objection={objection}
            canWrite={canDecide}
            suggestedDocuments={draft?.missingDocuments}
          />
          <ExternalCheckPanel
            objectionId={objection.objectionId}
            initialChecks={objection.externalChecks}
            canWrite={canDecide}
            // 서버는 확정된 뒤만 막는다(D9). 승인 대기 중 회신은 승인 직전 요건 재계산에 들어간다
            isClosed={objection.objectionStatus === "DECIDED"}
          />
        </div>
      </FormSection>

      <FormSection title="다툼 거래" className="mb-0">
        <p className="mb-2 text-base text-ink">
          <span className="font-bold text-primary">
            [총 {objection.disputedTransfers.length}건]
          </span>{" "}
          합계 {formatAmount(disputedTotal)}
        </p>
        <DataGrid
          columns={disputedColumns}
          rows={objection.disputedTransfers}
          rowKey={(row) => row.transactionNumber}
          emptyMessage="다툼 거래가 없습니다."
        />
      </FormSection>

      <FormSection title="명의인 소명" className="mb-0">
        <Panel>
          <LabelValueRow
            label="이의제기 사유"
            value={
              <span>
                {formatClause(objection.clause)}
                {scope && (
                  <span className="ml-2 text-xs text-ink-faint">{scope}</span>
                )}
              </span>
            }
            labelWidth={140}
          />
          <LabelValueRow
            label="간소화 신청"
            value={yesNo(objection.simplifiedRequested)}
            labelWidth={140}
          />
          <LabelValueRow
            label="신분증 사본"
            value={objection.idCopyConfirmed ? "확인" : "미확인"}
            labelWidth={140}
          />
          <LabelValueRow
            label="소송 계속"
            value={yesNo(objection.litigationPending)}
            labelWidth={140}
          />
          <div className="border-t border-border px-4 py-3">
            <p className="mb-1 text-base font-bold text-ink">소명 원문</p>
            <p className="text-base leading-relaxed whitespace-pre-wrap text-ink">
              {objection.statement || "-"}
            </p>
          </div>
        </Panel>
      </FormSection>

      <FormSection title="첨부 서류" className="mb-0">
        <DocumentEvidence
          objectionId={objection.objectionId}
          accessReason={reason ?? ""}
        />
      </FormSection>

      <FormSection title="AI 분석" className="mb-0">
        <AgentAnalysis
          objectionId={objection.objectionId}
          isDecided={objection.decision != null}
          canRequest={canDecide}
          serverBranch={objection.gate.branch || undefined}
        />
      </FormSection>

      <FormSection title="주장 대 원장 대조" className="mb-0">
        <LedgerEvidence
          objectionId={objection.objectionId}
          rules={objection.gate.rules}
        />
      </FormSection>

      <FormSection title="해제 요건 점검" className="mb-0">
        <GateChecklist objection={objection} />
      </FormSection>

      <FormSection title="판정 확정" className="mb-0">
        {objection.decision ? (
          <ConfirmedDecision decision={objection.decision} />
        ) : pending ? (
          <ApprovalPanel
            objectionId={objection.objectionId}
            decision={pending}
            canApprove={canApprove}
            currentAdminId={currentAdminId}
            onSettled={(kind, settled) =>
              setOutcome(
                kind === "APPROVED"
                  ? { kind: "APPROVED", result: settled.result }
                  : {
                      kind: "RETURNED",
                      result: settled.result,
                      reason: settled.returnReason,
                    },
              )
            }
            onSuperseded={() => setOutcome({ kind: "SUPERSEDED" })}
          />
        ) : canDecide && canWriteDecision ? (
          <Adm05ObjectionDecisionForm
            objection={objection}
            onConfirmed={(result, status) =>
              setOutcome({
                kind: status === "PENDING_APPROVAL" ? "PENDING" : "CONFIRMED",
                result,
              })
            }
          />
        ) : (
          <Alert variant="info" title="조회 전용 권한">
            판정 확정은 지급정지 변경 권한이 있는 관리자만 할 수 있습니다.
          </Alert>
        )}
      </FormSection>

      <FormSection title="통지 기록" className="mb-0">
        <NoticeList objectionId={objection.objectionId} />
      </FormSection>

      <NoticeBoxFooter
        items={[
          "해제 요건 점검은 서버가 원장으로 계산하며 AI 분석 결과는 해제 근거로 쓰이지 않습니다.",
          "불수용은 언제나 고를 수 있고, 지급정지를 줄이는 판정은 요건을 충족할 때만 열립니다.",
          "수용과 일부 지급정지는 작성한 관리자가 아닌 다른 관리자가 승인해야 계좌에 반영됩니다.",
          "심사 기한은 소명 완비 확인일부터 5영업일이고, 남은 일수는 주말만 빼고 셉니다. 공휴일은 서버 기한에 반영됩니다.",
          "해제 범위는 이의제기 사유가 정합니다. 제1호와 제2호는 수용, 제3호는 일부 지급정지입니다.",
          "확정 직전에 서버가 요건을 다시 계산하므로, 그 사이 원장이 바뀌면 확정이 거부될 수 있습니다.",
        ]}
      />
    </div>
  )
}
