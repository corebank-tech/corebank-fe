import * as React from "react"
import { useNavigate, useParams } from "react-router"
import {
  approveFdsHeldTransfer,
  clearPendingFdsAdminAction,
  fraudRejectFdsHeldTransfer,
  readPendingFdsAdminAction,
  recordFdsAdminCallResult,
  rejectFdsHeldTransfer,
  useFdsHeldTransferDetail,
  writePendingFdsAdminAction,
  type FdsCallResult,
  type FdsDecision,
  type PendingFdsAdminAction,
} from "@/entities/fds"
import { ApiError, toErrorMessage } from "@/shared/api/api-error"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { Input } from "@/shared/ui/input"
import { LabelValueRow } from "@/shared/ui/label-value-row"
import { Panel, PanelHeader } from "@/shared/ui/panel"
import { Select } from "@/shared/ui/select"
import { formatAmount, formatDateTime } from "@/shared/lib/format"
import type { FdsHoldDetail } from "@/shared/api/generated"

const decisionLabel: Record<FdsDecision, string> = {
  APPROVE: "승인",
  REJECT: "일반 거절",
  FRAUD_REJECT: "사기 확정 및 거절",
}
const callLabels: Record<string, string> = {
  CUSTOMER_CONFIRMED: "고객 확인",
  CUSTOMER_DENIED: "고객 부인",
  NO_ANSWER: "응답 없음",
  INCONCLUSIVE: "판단 불가",
}
const yesNo = (value?: boolean) =>
  value == null ? "-" : value ? "예" : "아니오"
const dateTime = (value?: string) => (value ? formatDateTime(value) : "-")
const valueOrDash = (value?: string | number | null) => value ?? "-"
const riskLabels: Record<string, string> = {
  MATCH: "위험 계좌 목록과 일치",
  NO_MATCH: "위험 계좌 목록과 일치하지 않음",
  UNAVAILABLE: "위험 계좌 조회 불가",
}
const statusVariant = (status?: string) =>
  status === "COMPLETED" || status === "AVAILABLE" || status === "ACTIVE"
    ? "success"
    : status === "FAILED" || status === "CONFLICT"
      ? "danger"
      : "warning"

const DetailPanel = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <Panel className="p-5">
    <PanelHeader title={title} />
    <div className="mt-3">{children}</div>
  </Panel>
)

const StatusValue = ({ value }: { value?: string }) =>
  value ? <Badge variant={statusVariant(value)}>{value}</Badge> : <span>-</span>

const DetailInformation = ({ detail }: { detail: FdsHoldDetail }) => {
  const original = detail.originalTransfer
  const policy = detail.serverPolicy
  const behavior = detail.behaviorSummary
  const score = detail.behaviorScore
  const investigation = detail.investigation
  const tools = detail.toolResults
  const report = detail.agentReport
  const risk = detail.riskAccountCheck

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <DetailPanel title="원본 이체">
        <LabelValueRow
          label="보류 ID"
          value={valueOrDash(original?.transferHoldId)}
        />
        <LabelValueRow
          label="보류 상태"
          value={<StatusValue value={original?.holdStatus} />}
        />
        <LabelValueRow label="보류 시각" value={dateTime(original?.heldAt)} />
        <LabelValueRow
          label="이체 금액"
          value={original?.amount == null ? "-" : formatAmount(original.amount)}
        />
        <LabelValueRow
          label="수취 은행"
          value={valueOrDash(original?.recipientBankCode)}
        />
        <LabelValueRow
          label="수취 계좌"
          value={valueOrDash(original?.recipientAccountMasked)}
        />
        <LabelValueRow
          label="해제 방식"
          value={
            original?.releaseMode === "ON_APPROVAL"
              ? "관리자 승인 후 실행"
              : valueOrDash(original?.releaseMode)
          }
        />
        <LabelValueRow
          label="처리 사유"
          value={valueOrDash(original?.reasonCode)}
        />
        <LabelValueRow
          label="완료 시각"
          value={dateTime(original?.completedAt)}
        />
      </DetailPanel>

      <DetailPanel title="서버 보류 정책">
        <LabelValueRow
          label="적용 정책"
          value={policy?.policyCode ? `정책 ${policy.policyCode}` : "-"}
        />
        <LabelValueRow
          label="10분 이체 건수"
          value={policy?.count10m == null ? "-" : `${policy.count10m}건`}
        />
        <LabelValueRow
          label="10분 누적 금액"
          value={
            policy?.amount10m == null ? "-" : formatAmount(policy.amount10m)
          }
        />
        <LabelValueRow
          label="망설임 감지"
          value={yesNo(policy?.hesitationInWindow)}
        />
        <LabelValueRow
          label="신규 수취인"
          value={yesNo(policy?.newRecipientAtWindowStart)}
        />
      </DetailPanel>

      <DetailPanel title="행동 요약">
        <LabelValueRow
          label="확인 화면 복귀"
          value={behavior?.backCount == null ? "-" : `${behavior.backCount}회`}
        />
        <LabelValueRow
          label="확정 금액 재수정"
          value={
            behavior?.amountRevisionCount == null
              ? "-"
              : `${behavior.amountRevisionCount}회`
          }
        />
        <LabelValueRow
          label="확인 화면 체류"
          value={
            behavior?.confirmActiveSeconds == null
              ? "-"
              : `${behavior.confirmActiveSeconds}초`
          }
        />
        <LabelValueRow
          label="점수 상태"
          value={<StatusValue value={behavior?.behaviorScoreStatus} />}
        />
        <LabelValueRow
          label="행동 위험 점수"
          value={
            behavior?.behaviorRiskScore == null
              ? "-"
              : behavior.behaviorRiskScore.toFixed(3)
          }
        />
        <LabelValueRow
          label="모델 버전"
          value={valueOrDash(behavior?.modelVersion)}
        />
        <LabelValueRow
          label="피처 버전"
          value={valueOrDash(behavior?.featureVersion)}
        />
      </DetailPanel>

      <DetailPanel title="행동 위험 점수">
        <LabelValueRow
          label="처리 상태"
          value={<StatusValue value={score?.status} />}
        />
        <LabelValueRow
          label="점수"
          value={score?.score == null ? "산정 전" : score.score.toFixed(3)}
        />
        <LabelValueRow
          label="모델 버전"
          value={valueOrDash(score?.modelVersion)}
        />
        <LabelValueRow
          label="피처 버전"
          value={valueOrDash(score?.featureVersion)}
        />
        <LabelValueRow
          label="미산정 사유"
          value={valueOrDash(score?.unavailableReason)}
        />
      </DetailPanel>

      <DetailPanel title="조사 상태">
        <LabelValueRow
          label="조사 ID"
          value={valueOrDash(investigation?.investigationId)}
        />
        <LabelValueRow
          label="상태"
          value={<StatusValue value={investigation?.status} />}
        />
        <LabelValueRow
          label="시도 횟수"
          value={
            investigation?.attemptCount == null
              ? "-"
              : `${investigation.attemptCount}회`
          }
        />
        <LabelValueRow
          label="다음 시도"
          value={dateTime(investigation?.nextAttemptAt)}
        />
        <LabelValueRow
          label="작업 만료"
          value={dateTime(investigation?.leaseExpiresAt)}
        />
        <LabelValueRow
          label="실패 사유"
          value={valueOrDash(investigation?.failureReason)}
        />
      </DetailPanel>

      <DetailPanel title="조사 Tool 결과">
        <p className="mb-2 font-bold">최근 이체 이력</p>
        <LabelValueRow
          label="조회 실행"
          value={yesNo(tools?.history?.executed)}
        />
        <LabelValueRow
          label="조회 범위"
          value={
            tools?.history?.rangeFrom || tools?.history?.rangeTo
              ? `${dateTime(tools.history.rangeFrom)} ~ ${dateTime(tools.history.rangeTo)}`
              : "-"
          }
        />
        <LabelValueRow
          label="추가 이력"
          value={yesNo(tools?.history?.hasMore)}
        />
        {tools?.history?.items?.length ? (
          <ul className="mt-2 space-y-2 border-t border-border pt-3">
            {tools.history.items.map((item) => (
              <li key={item.refId} className="text-sm text-ink-muted">
                거래 {item.refId ?? "-"} ·{" "}
                {item.amount == null ? "금액 미상" : formatAmount(item.amount)}{" "}
                · {dateTime(item.transferredAt)} ·{" "}
                {item.recipientAccountMasked ?? "계좌 미상"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm mt-2 text-ink-muted">
            제공된 최근 이체 이력이 없습니다.
          </p>
        )}
        <p className="mt-5 mb-2 border-t border-border pt-4 font-bold">
          수취인 관계
        </p>
        <LabelValueRow
          label="조회 실행"
          value={yesNo(tools?.recipientContext?.executed)}
        />
        <LabelValueRow
          label="최초 성공 이체"
          value={dateTime(tools?.recipientContext?.firstSucceededAt)}
        />
        <LabelValueRow
          label="구간 이전 거래"
          value={yesNo(tools?.recipientContext?.hasSucceededBeforeWindow)}
        />
        <LabelValueRow
          label="다른 출금계좌"
          value={
            tools?.recipientContext?.otherWithdrawalAccountCount == null
              ? "-"
              : `${tools.recipientContext.otherWithdrawalAccountCount}개`
          }
        />
      </DetailPanel>

      <DetailPanel title="Agent 조사 결과">
        <LabelValueRow
          label="상태"
          value={<StatusValue value={report?.status} />}
        />
        <LabelValueRow
          label="완료 시각"
          value={dateTime(report?.completedAt)}
        />
        <LabelValueRow label="조사 요약" value={valueOrDash(report?.summary)} />
        <LabelValueRow
          label="추가 확인 필요"
          value={
            report?.missingInformation?.length
              ? report.missingInformation.join(", ")
              : "없음"
          }
        />
        <LabelValueRow
          label="고객 질문 제안"
          value={
            report?.suggestedQuestions?.length
              ? report.suggestedQuestions.join(" / ")
              : "없음"
          }
        />
        {report?.secondaryFindings?.length ? (
          <ul className="mt-3 space-y-2 border-t border-border pt-3">
            {report.secondaryFindings.map((finding, index) => (
              <li key={`${finding.code}-${index}`} className="text-sm">
                <strong>{finding.code ?? "추가 발견"}</strong> ·{" "}
                {finding.description ?? "설명 없음"}{" "}
                {finding.confidence ? `· 신뢰도 ${finding.confidence}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </DetailPanel>

      <DetailPanel title="위험 계좌 확인">
        <LabelValueRow
          label="판정"
          value={
            <Badge
              variant={
                risk?.status === "MATCH"
                  ? "danger"
                  : risk?.status === "NO_MATCH"
                    ? "success"
                    : "warning"
              }
            >
              {risk?.status ? (riskLabels[risk.status] ?? risk.status) : "-"}
            </Badge>
          }
        />
        <LabelValueRow
          label="위험 계좌 ID"
          value={valueOrDash(risk?.riskAccountId)}
        />
        <LabelValueRow
          label="데이터셋 버전"
          value={valueOrDash(risk?.datasetVersion)}
        />
        <LabelValueRow
          label="조회 불가 사유"
          value={valueOrDash(risk?.unavailableReason)}
        />
        <LabelValueRow
          label="조치 전 재검증"
          value={yesNo(risk?.revalidateBeforeAction)}
        />
        <p className="text-sm mt-3 text-ink-muted">
          위험 계좌 판정은 관리자 조치를 돕는 정보이며, 실제 사기 확정을
          의미하지 않습니다.
        </p>
      </DetailPanel>
    </div>
  )
}

export const FdsHeldTransferDetail = () => {
  const navigate = useNavigate()
  const { heldTransferId } = useParams()
  const transferHoldId = Number(heldTransferId)
  const validId = Number.isSafeInteger(transferHoldId) && transferHoldId > 0
  const query = useFdsHeldTransferDetail(validId ? transferHoldId : 0)
  const detail = query.data
  const [callResult, setCallResult] =
    React.useState<FdsCallResult>("INCONCLUSIVE")
  const [callReason, setCallReason] = React.useState("")
  const [pendingDecision, setPendingDecision] =
    React.useState<FdsDecision | null>(null)
  const [processing, setProcessing] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const recoveryAttempted = React.useRef(false)
  const latestCall = detail?.callRecords?.at(-1)?.callResult
  const risk = detail?.riskAccountCheck?.status
  const completed = detail?.adminAction?.status === "COMPLETED"
  const canApprove =
    !completed &&
    (risk === "NO_MATCH" || risk === "UNAVAILABLE") &&
    latestCall === "CUSTOMER_CONFIRMED"
  const canReject =
    !completed &&
    (risk === "NO_MATCH" || risk === "UNAVAILABLE") &&
    latestCall === "CUSTOMER_DENIED"
  const canRiskReject = !completed && risk === "MATCH"

  const performAction = React.useCallback(
    async (pending: PendingFdsAdminAction) => {
      setProcessing(true)
      setMessage(null)
      try {
        if (pending.actionType === "APPROVE")
          await approveFdsHeldTransfer(transferHoldId, pending.idempotencyKey)
        else if (pending.actionType === "FRAUD_REJECT")
          await fraudRejectFdsHeldTransfer(
            transferHoldId,
            pending.idempotencyKey,
          )
        else
          await rejectFdsHeldTransfer(
            transferHoldId,
            pending.reasonCode === "RISK_ACCOUNT_MATCH"
              ? "RISK_ACCOUNT_MATCH"
              : "CUSTOMER_DENIED",
            pending.idempotencyKey,
          )
      } catch (error) {
        setMessage(toErrorMessage(error) ?? "")
      } finally {
        const refreshed = await query.refetch()
        if (refreshed.data?.adminAction?.status === "COMPLETED")
          clearPendingFdsAdminAction(transferHoldId)
        setProcessing(false)
      }
    },
    [query, transferHoldId],
  )

  React.useEffect(() => {
    if (!detail || recoveryAttempted.current) return
    recoveryAttempted.current = true
    if (detail.adminAction?.status === "COMPLETED") {
      clearPendingFdsAdminAction(transferHoldId)
      return
    }
    const pending = readPendingFdsAdminAction(transferHoldId)
    if (pending) queueMicrotask(() => void performAction(pending))
  }, [detail, performAction, transferHoldId])

  if (!validId)
    return (
      <Panel className="p-8">
        <p role="alert">올바르지 않은 사건 ID입니다.</p>
        <Button
          className="mt-4"
          onClick={() => navigate("/admin/fds/held-transfers")}
        >
          목록
        </Button>
      </Panel>
    )
  if (query.isLoading)
    return (
      <Panel className="p-8">
        <p role="status">사건 상세를 불러오는 중입니다.</p>
      </Panel>
    )
  if (query.isError) {
    const notFound =
      query.error instanceof ApiError && query.error.status === 404
    return (
      <Panel className="p-8">
        <p role="alert">
          {notFound
            ? "존재하지 않는 FDS 보류 사건입니다."
            : (toErrorMessage(query.error) ?? "상세 조회에 실패했습니다.")}
        </p>
        <Button className="mt-4" onClick={() => void query.refetch()}>
          다시 시도
        </Button>
      </Panel>
    )
  }
  if (!detail) return null

  const reasonCode =
    pendingDecision === "APPROVE"
      ? null
      : pendingDecision === "FRAUD_REJECT"
        ? "FRAUD_CONFIRMED"
        : risk === "MATCH"
          ? "RISK_ACCOUNT_MATCH"
          : "CUSTOMER_DENIED"
  const confirm = () => {
    if (!pendingDecision) return
    const pending: PendingFdsAdminAction = {
      actionType: pendingDecision,
      reasonCode,
      idempotencyKey: crypto.randomUUID(),
    }
    writePendingFdsAdminAction(transferHoldId, pending)
    setPendingDecision(null)
    void performAction(pending)
  }
  const saveCall = async () => {
    setProcessing(true)
    setMessage(null)
    try {
      await recordFdsAdminCallResult(
        transferHoldId,
        callResult,
        callReason,
        crypto.randomUUID(),
      )
      setCallReason("")
      await query.refetch()
    } catch (error) {
      setMessage(toErrorMessage(error) ?? "")
    } finally {
      setProcessing(false)
    }
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-muted">
            사건 ID {detail.transferHoldId}
          </p>
          <h2 className="text-page font-bold">보류 사건 조사 상세</h2>
        </div>
        <Button
          variant="secondary"
          onClick={() => navigate("/admin/fds/held-transfers")}
        >
          목록
        </Button>
      </div>
      {risk === "MATCH" && (
        <div
          role="alert"
          className="border-l-8 border-danger bg-danger-tint p-4 font-bold text-danger"
        >
          활성 위험 계좌와 일치합니다. 승인·사기 확정은 불가하며 위험 계좌 일치
          거절만 가능합니다.
        </div>
      )}
      <Panel className="p-5">
        <PanelHeader title="사건 요약" />
        <div className="mt-3">
          <LabelValueRow label="보류 상태" value={detail.holdStatus ?? "-"} />
          <LabelValueRow
            label="금액"
            value={`${(detail.amount ?? 0).toLocaleString()}원`}
          />
          <LabelValueRow
            label="수취계좌"
            value={detail.recipientAccountMasked ?? "-"}
          />
          <LabelValueRow label="위험계좌 판정" value={risk ?? "-"} />
        </div>
      </Panel>
      <DetailInformation detail={detail} />
      <Panel className="p-5">
        <PanelHeader title="고객 확인 결과 기록" />
        <div className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]">
          <Select
            aria-label="고객 확인 결과"
            value={callResult}
            onChange={(event) =>
              setCallResult(event.target.value as FdsCallResult)
            }
          >
            <option value="CUSTOMER_CONFIRMED">고객 확인</option>
            <option value="CUSTOMER_DENIED">고객 부인</option>
            <option value="NO_ANSWER">응답 없음</option>
            <option value="INCONCLUSIVE">판단 불가</option>
          </Select>
          <Input
            aria-label="콜 기록 사유"
            value={callReason}
            maxLength={200}
            onChange={(event) => setCallReason(event.target.value)}
            placeholder="확인 내용을 입력하세요"
          />
          <Button
            disabled={processing || completed || !callReason.trim()}
            onClick={() => void saveCall()}
          >
            저장
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {detail.callRecords?.map((record) => (
            <p key={record.callRecordId} className="text-sm">
              {record.recordedAt ?? "-"} ·{" "}
              {callLabels[record.callResult ?? ""] ?? record.callResult} ·{" "}
              {record.investigationReason}
            </p>
          ))}
        </div>
      </Panel>
      <Panel className="p-5">
        <PanelHeader title="관리자 최종 조치" />
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Button
            variant="success"
            disabled={processing || !canApprove}
            onClick={() => setPendingDecision("APPROVE")}
          >
            승인
          </Button>
          <Button
            variant="danger"
            disabled={processing || !(canReject || canRiskReject)}
            onClick={() => setPendingDecision("REJECT")}
          >
            {risk === "MATCH" ? "위험 계좌 일치로 거절" : "일반 거절"}
          </Button>
          <Button
            variant="danger"
            disabled={processing || !canReject}
            onClick={() => setPendingDecision("FRAUD_REJECT")}
          >
            사기 확정 및 거절
          </Button>
        </div>
        {message && (
          <p role="alert" className="mt-3 text-danger">
            {message}
          </p>
        )}
        {detail.adminAction && (
          <div className="mt-4">
            <LabelValueRow
              label="조치 상태"
              value={
                <Badge
                  variant={
                    detail.adminAction.status === "COMPLETED"
                      ? "success"
                      : detail.adminAction.status === "PENDING"
                        ? "warning"
                        : "danger"
                  }
                >
                  {detail.adminAction.status}
                </Badge>
              }
            />
            <LabelValueRow
              label="조치 유형"
              value={detail.adminAction.actionType ?? "-"}
            />
            <LabelValueRow
              label="서버 사유 코드"
              value={detail.adminAction.reasonCode ?? "-"}
            />
            <LabelValueRow
              label="복구 필요"
              value={detail.adminAction.recoveryRequired ? "예" : "아니오"}
            />
            <LabelValueRow
              label="실패 사유"
              value={detail.adminAction.failureReason ?? "-"}
            />
          </div>
        )}
        {detail.riskRegistration && (
          <div className="mt-4 border-t border-border pt-4">
            <LabelValueRow
              label="위험계좌 등록 상태"
              value={detail.riskRegistration.status ?? "-"}
            />
            <LabelValueRow
              label="등록 복구 필요"
              value={detail.riskRegistration.recoveryRequired ? "예" : "아니오"}
            />
            <LabelValueRow
              label="등록 실패 사유"
              value={detail.riskRegistration.failureReason ?? "-"}
            />
          </div>
        )}
      </Panel>
      <ConfirmDialog
        open={pendingDecision != null}
        onClose={() => setPendingDecision(null)}
        onConfirm={confirm}
        title="관리자 조치 확인"
        confirmLabel="조치 실행"
        messages={[
          "이 조치는 되돌릴 수 없습니다.",
          pendingDecision === "FRAUD_REJECT"
            ? "거절과 함께 위험 계좌 등록이 진행됩니다."
            : "사건과 사유를 다시 확인하세요.",
        ]}
        items={[
          { label: "사건 ID", value: transferHoldId },
          {
            label: "조치명",
            value: pendingDecision ? decisionLabel[pendingDecision] : "-",
          },
          { label: "조치 사유 코드", value: reasonCode ?? "해당 없음" },
        ]}
      />
    </div>
  )
}
