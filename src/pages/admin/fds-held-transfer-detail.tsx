import * as React from "react"
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  Database,
  LockKeyhole,
  Search,
  ShieldAlert,
  UserRoundCheck,
} from "lucide-react"
import { useNavigate, useParams } from "react-router"
import {
  findFdsHeldTransfer,
  formatWon,
  approveFdsHeldTransfer,
  rejectFdsHeldTransfer,
  fraudRejectFdsHeldTransfer,
  recordFdsAdminCallResult,
  getFdsHeldTransferActionDetail,
  readPendingFdsAdminAction,
  writePendingFdsAdminAction,
  clearPendingFdsAdminAction,
  revealAt,
  useFdsFixturePlayer,
  type FdsActor,
  type FdsCallResult,
  type FdsDecision,
  type FdsHeldTransferView,
  type FdsInvestigationStep,
  type FdsStepReveal,
  type PendingFdsAdminAction,
  type FdsAdminActionState,
} from "@/entities/fds"
import { formatDateTime } from "@/shared/lib/format"
import { Badge, type BadgeVariant } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { EmptyState } from "@/shared/ui/empty-state"
import { LabelValueRow } from "@/shared/ui/label-value-row"
import { Panel, PanelHeader } from "@/shared/ui/panel"
import { Select } from "@/shared/ui/select"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import "@/pages/admin/fds-held-transfer-motion.css"

const actorLabel: Record<FdsActor, string> = {
  SERVER: "서버 규칙",
  AGENT: "AI Agent",
  HUMAN: "담당자",
}

const riskVariant = (
  status: FdsHeldTransferView["riskStatus"],
): BadgeVariant =>
  status === "MATCH" ? "danger" : status === "NO_MATCH" ? "success" : "warning"

const fixtureTime = (receivedAt: string) =>
  receivedAt.match(/T(\d{2}:\d{2})/)?.[1] ??
  formatDateTime(receivedAt).slice(11, 16)

const EvidenceTimeline = ({ fixture }: { fixture: FdsHeldTransferView }) => (
  <Panel className="p-5">
    <h2 className="font-bold text-ink">10분 반복 이체</h2>
    <p className="text-sm mt-1 text-ink-faint">
      앞선 성공 2건과 현재 미기표 요청 1건
    </p>
    <ol
      className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center"
      aria-label="성공 이체와 현재 보류 요청의 시간 순서"
    >
      {["성공 이체 1", "성공 이체 2", "현재 요청"].map((label, index) => (
        <React.Fragment key={label}>
          {index > 0 && (
            <ArrowRight
              className="mx-auto rotate-90 text-ink-faint md:rotate-0"
              size={18}
              aria-hidden="true"
            />
          )}
          <li
            className={`border border-t-4 border-border p-4 ${
              index === 2
                ? "border-t-warning bg-warning-tint"
                : "border-t-success bg-surface"
            }`}
          >
            <div className="text-sm flex justify-between gap-2 font-bold">
              <span>{label}</span>
              <span className={index === 2 ? "text-warning" : "text-success"}>
                {index === 2 ? "HELD" : "SUCCESS"}
              </span>
            </div>
            <p className="mt-3 font-bold">{formatWon(fixture.amount)}</p>
            <small className="mt-2 flex items-center gap-1 text-ink-muted">
              {index === 2 ? <LockKeyhole size={13} /> : <Clock3 size={13} />}
              {index === 2
                ? `${fixtureTime(fixture.receivedAt)} · 미기표`
                : `09:0${index + 6} · 기표 완료`}
            </small>
          </li>
        </React.Fragment>
      ))}
    </ol>
  </Panel>
)

const InvestigationScene = ({
  fixture,
  step,
  index,
  reveal,
}: {
  fixture: FdsHeldTransferView
  step: FdsInvestigationStep
  index: number
  reveal: FdsStepReveal
}) => (
  <Panel key={`${fixture.id}-${index}`} className="fds-scene-enter">
    <div className="text-sm flex justify-between border-b border-border px-5 py-3 font-bold text-ink-muted">
      <span>
        {index + 1} / {fixture.steps.length}
      </span>
      <span>{step.title}</span>
    </div>
    <div className="flex min-h-56 flex-col items-center justify-center gap-4 px-6 py-8 text-center">
      <span
        className={`grid h-14 w-14 place-items-center rounded-full ${
          step.actor === "SERVER"
            ? "bg-success-tint text-success"
            : step.actor === "AGENT"
              ? "bg-primary-tint text-primary"
              : "bg-warning-tint text-warning"
        }`}
      >
        {step.id === "failed" ? (
          <AlertTriangle size={28} />
        ) : step.actor === "SERVER" ? (
          <LockKeyhole size={28} />
        ) : step.actor === "AGENT" ? (
          <Search size={28} />
        ) : (
          <UserRoundCheck size={28} />
        )}
      </span>
      <div>
        <p className="text-sm font-bold text-primary">
          {actorLabel[step.actor]}
        </p>
        <h2 className="mt-1 text-h2 font-bold text-ink">{step.title}</h2>
        <p className="mt-2 text-base text-ink-muted">{step.narration}</p>
      </div>
      {step.tool && (
        <div className="fds-tool-pulse flex items-center gap-3 border border-primary bg-primary-tint px-5 py-3 text-primary">
          <Database size={20} />
          <strong>{step.tool}</strong>
          <span>→</span>
          <span>{step.output}</span>
        </div>
      )}
      {reveal.agentError && (
        <p
          role="alert"
          className="border-l-4 border-warning bg-warning-tint p-3 text-left text-warning"
        >
          {reveal.agentError} 서버의 HELD 상태는 유지됩니다.
        </p>
      )}
    </div>
    <div className="grid border-t border-border bg-surface md:grid-cols-2">
      <div className="border-b border-border p-4 md:border-r md:border-b-0">
        <span className="text-xs font-bold text-ink-faint">입력</span>
        <p className="text-sm mt-1">{step.input}</p>
      </div>
      <div className="p-4">
        <span className="text-xs font-bold text-ink-faint">결과</span>
        <p className="text-sm mt-1">{step.output}</p>
      </div>
    </div>
  </Panel>
)

const DetailContent = ({ fixture }: { fixture: FdsHeldTransferView }) => {
  const navigate = useNavigate()
  const player = useFdsFixturePlayer(fixture)
  const [callResult, setCallResult] = React.useState<FdsCallResult | "">("")
  const [decision, setDecision] = React.useState<FdsDecision | null>(null)
  const [pendingDecision, setPendingDecision] =
    React.useState<FdsDecision | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const reveal = revealAt(fixture.steps, player.index)
  const human = player.step.actor === "HUMAN"
  const riskMatch = fixture.riskStatus === "MATCH"
  const riskStepIndex = fixture.steps.findIndex(
    (step) => step.id === "risk-check",
  )
  const riskRevealed = riskStepIndex >= 0 && player.index >= riskStepIndex

  const restoreServerDecision = React.useCallback(async () => {
    const detail = await getFdsHeldTransferActionDetail(fixture.transferHoldId)
    const action = detail.adminAction
    if (action?.status !== "COMPLETED") return false
    const restored: FdsDecision =
      action.actionType === "FRAUD_REJECT"
        ? "FRAUD_REJECT"
        : action.actionType === "APPROVE"
          ? "APPROVE"
          : "REJECT"
    setDecision(restored)
    clearPendingFdsAdminAction(fixture.transferHoldId)
    setActionError(null)
    return true
  }, [fixture.transferHoldId])

  const performAction = React.useCallback(
    async (pending: PendingFdsAdminAction) => {
      setIsProcessing(true)
      setActionError(null)
      try {
        if (fixture.riskStatus !== "MATCH") {
          await recordFdsAdminCallResult(
            fixture.transferHoldId,
            pending.decision === "APPROVE"
              ? "CUSTOMER_CONFIRMED"
              : "CUSTOMER_DENIED",
            pending.decision === "APPROVE"
              ? "고객이 이체 요청 사실을 확인함"
              : "고객이 이체 요청 사실을 부인함",
            pending.callRecordIdempotencyKey ?? pending.idempotencyKey,
          )
        }

        let result: FdsAdminActionState
        if (pending.decision === "APPROVE") {
          result = await approveFdsHeldTransfer(
            fixture.transferHoldId,
            pending.idempotencyKey,
          )
        } else if (pending.decision === "FRAUD_REJECT") {
          result = await fraudRejectFdsHeldTransfer(
            fixture.transferHoldId,
            pending.idempotencyKey,
          )
        } else {
          result = await rejectFdsHeldTransfer(
            fixture.transferHoldId,
            fixture.riskStatus === "MATCH"
              ? "RISK_ACCOUNT_MATCH"
              : "CUSTOMER_DENIED",
            pending.idempotencyKey,
          )
        }
        if (result.status === "COMPLETED") {
          setDecision(pending.decision)
          clearPendingFdsAdminAction(fixture.transferHoldId)
          // 응답은 완료지만 상세 read model 반영이 늦을 수 있어 성공 표시 뒤에도 재조회한다.
          try {
            await restoreServerDecision()
          } catch {
            // 완료 응답이 정본이므로 상세의 일시적 조회 실패를 실패로 되돌리지 않는다.
          }
        } else {
          setActionError(
            result.recoveryRequired
              ? "서버 복구가 필요한 조치입니다. 새로고침해 처리 상태를 다시 확인하세요."
              : "조치가 아직 완료되지 않았습니다. 새로고침해 처리 상태를 다시 확인하세요.",
          )
        }
      } catch {
        // 조치 응답이 유실됐을 수 있으므로 실패로 단정하지 않고 서버 정본을 다시 읽는다.
        try {
          if (await restoreServerDecision()) return
        } catch {
          // 다음 새로고침에서 같은 멱등키로 다시 확인한다.
        }
        setActionError(
          "처리 결과를 확인하지 못했습니다. 새로고침하면 같은 요청을 안전하게 복원합니다.",
        )
      } finally {
        setIsProcessing(false)
      }
    },
    [fixture.riskStatus, fixture.transferHoldId, restoreServerDecision],
  )

  React.useEffect(() => {
    let active = true
    const restore = async () => {
      try {
        if (await restoreServerDecision()) return
      } catch {
        // 상세 조회 실패 뒤에도 로컬에 남은 동일 멱등 요청으로 복구를 시도한다.
      }
      const pending = readPendingFdsAdminAction(fixture.transferHoldId)
      if (active && pending) await performAction(pending)
    }
    void restore()
    return () => {
      active = false
    }
  }, [fixture.transferHoldId, performAction, restoreServerDecision])

  const confirmAction = () => {
    if (pendingDecision == null) return
    const pending: PendingFdsAdminAction = {
      decision: pendingDecision,
      idempotencyKey: crypto.randomUUID(),
      ...(fixture.riskStatus !== "MATCH" && {
        callRecordIdempotencyKey: crypto.randomUUID(),
      }),
    }
    writePendingFdsAdminAction(fixture.transferHoldId, pending)
    setPendingDecision(null)
    void performAction(pending)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink-muted">
            사건번호 {fixture.caseNo} · flowId {fixture.flowId}
          </p>
          <h2 className="text-page font-bold text-ink">보류 사건 조사</h2>
        </div>
        <Button
          variant="secondary"
          onClick={() => navigate("/admin/fds/held-transfers")}
        >
          목록
        </Button>
      </div>

      {riskMatch && riskRevealed && (
        <div
          role="alert"
          className="fds-risk-enter flex items-center gap-4 border-2 border-l-8 border-danger bg-danger-tint p-4"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-danger text-white">
            <ShieldAlert size={27} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-danger">위험 계좌 일치</p>
            <strong className="text-lg text-danger">
              고객 아웃바운드 콜 없이 거절만 가능합니다.
            </strong>
          </div>
          <Badge variant="danger">MATCH</Badge>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Panel className="self-start p-4 xl:sticky xl:top-4">
          <h2 className="mb-4 font-bold">처리 단계</h2>
          <ol className="fds-step-rail">
            {fixture.steps.map((step, index) => (
              <li
                key={step.id}
                className="fds-step-item"
                data-state={
                  index < player.index
                    ? "done"
                    : index === player.index
                      ? "active"
                      : "upcoming"
                }
                data-actor={step.actor}
              >
                <span className="fds-step-dot">
                  {index < player.index ? "✓" : index + 1}
                </span>
                <div>
                  <strong>{step.title}</strong>
                  <small>{actorLabel[step.actor]}</small>
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        <div className="min-w-0 space-y-5">
          <EvidenceTimeline fixture={fixture} />
          <InvestigationScene
            fixture={fixture}
            step={player.step}
            index={player.index}
            reveal={reveal}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="원본 이체 요청" />
              <div className="border-t border-border">
                <LabelValueRow label="고객" value={fixture.customer} />
                <LabelValueRow
                  label="요청 일시"
                  value={formatDateTime(fixture.receivedAt)}
                />
                <LabelValueRow
                  label="출금 계좌"
                  value={fixture.withdrawalAccountNumber}
                />
                <LabelValueRow
                  label="수취 계좌"
                  value={`${fixture.recipientBankName} ${fixture.recipientAccountNumber}`}
                />
                <LabelValueRow label="수취인" value={fixture.recipientName} />
                <LabelValueRow label="금액" value={formatWon(fixture.amount)} />
                <LabelValueRow
                  label="서버 상태"
                  value={<Badge variant="warning">HELD</Badge>}
                />
              </div>
            </Panel>
            <Panel className="p-5">
              <h2 className="font-bold">서버 보류 근거</h2>
              <Badge variant="warning" className="mt-3">
                정책 {fixture.policy}
              </Badge>
              <p className="mt-3 border-t border-border pt-3 text-base leading-7">
                {fixture.serverHoldReason}
              </p>
              <p className="text-sm mt-3 text-ink-faint">
                Agent 추가 발견과 구분되는 서버 정책 판정입니다.
              </p>
            </Panel>
          </div>

          {riskRevealed && (
            <Panel className={riskMatch ? "border-2 border-danger" : undefined}>
              <PanelHeader title="위험 계좌 판정" />
              <div className="border-t border-border">
                <LabelValueRow
                  label="판정 상태"
                  value={
                    <Badge variant={riskVariant(fixture.riskStatus)}>
                      {fixture.riskStatus}
                    </Badge>
                  }
                />
                <LabelValueRow
                  label="데이터셋 버전"
                  value={fixture.riskDatasetVersion ?? "확인 불가"}
                />
                <LabelValueRow
                  label="위험 기록 ID"
                  value={fixture.riskRecordId ?? "해당 없음"}
                />
              </div>
              <p className="border-t border-border p-4 text-base">
                {fixture.riskReason}
              </p>
            </Panel>
          )}

          {reveal.history && (
            <Panel className="p-5">
              <h2 className="font-bold">거래 이력 Tool 결과</h2>
              <div className="mt-3 border-t border-border pt-3">
                {reveal.history.map((id) => (
                  <p key={id} className="py-1 text-base">
                    성공 이체 근거 ID · <strong>{id}</strong>
                  </p>
                ))}
              </div>
            </Panel>
          )}

          {reveal.recipientContext && (
            <Panel className="p-5">
              <h2 className="font-bold">수취인 맥락 Tool 결과</h2>
              <p className="mt-3 border-t border-border pt-3 text-base">
                {reveal.recipientContext}
              </p>
            </Panel>
          )}

          {reveal.agentFinding && fixture.agentStatus !== "FAILED" && (
            <Panel className="p-5">
              <h2 className="font-bold">Agent 추가 확인 사항</h2>
              <p className="mt-3 border-t border-border pt-3 text-base">
                {reveal.agentFinding}
              </p>
              <p className="text-sm mt-2 text-ink-faint">
                서버 보류 사유가 아닌 조사 과정의 추가 관찰 사항입니다.
              </p>
            </Panel>
          )}

          {reveal.agentError && (
            <Panel className="border-warning p-5">
              <h2 className="font-bold text-warning">Agent 조사 실패</h2>
              <p className="mt-3">{reveal.agentError}</p>
              <p className="text-sm mt-2 text-ink-muted">
                AI 보고서 없이도 HELD를 유지하고 담당자가 검토합니다.
              </p>
            </Panel>
          )}

          {human && (
            <Panel className="p-6">
              <h2 className="text-h2 font-bold">고객 확인 기록</h2>
              {riskMatch ? (
                <div className="border-l-4 border-danger bg-danger-tint p-4 font-bold text-danger">
                  위험 계좌 일치 건은 아웃바운드 콜 없이 거절만 가능합니다.
                </div>
              ) : (
                <label
                  className="flex max-w-xl flex-col gap-2 font-bold"
                  htmlFor="fds-call-result"
                >
                  콜 결과
                  <Select
                    id="fds-call-result"
                    value={callResult}
                    onChange={(event) => {
                      setCallResult(event.target.value as FdsCallResult | "")
                      setDecision(null)
                    }}
                  >
                    <option value="">선택하세요</option>
                    <option value="CONFIRMED">고객이 직접 요청</option>
                    <option value="DENIED">요청 사실 부인</option>
                    <option value="UNREACHABLE">연락 불가</option>
                  </Select>
                </label>
              )}
              <div className="mt-5 flex flex-wrap gap-2">
                {!riskMatch && (
                  <Button
                    variant="success"
                    disabled={
                      callResult !== "CONFIRMED" ||
                      isProcessing ||
                      decision != null
                    }
                    onClick={() => setPendingDecision("APPROVE")}
                  >
                    승인
                  </Button>
                )}
                <Button
                  variant="danger"
                  disabled={
                    (!riskMatch && callResult !== "DENIED") ||
                    isProcessing ||
                    decision != null
                  }
                  onClick={() => setPendingDecision("REJECT")}
                >
                  {riskMatch ? "위험 계좌 일치로 거절" : "거절"}
                </Button>
                {!riskMatch && (
                  <Button
                    variant="danger"
                    disabled={
                      callResult !== "DENIED" ||
                      isProcessing ||
                      decision != null
                    }
                    onClick={() => setPendingDecision("FRAUD_REJECT")}
                  >
                    사기 확정 및 거절
                  </Button>
                )}
              </div>
              {decision && (
                <div
                  role="status"
                  className="mt-5 border-l-4 border-primary bg-primary-tint p-4"
                >
                  <strong>
                    {decision === "APPROVE"
                      ? "승인"
                      : decision === "FRAUD_REJECT"
                        ? "사기 확정 및 거절 · FRAUD_CONFIRMED"
                        : riskMatch
                          ? "거절 · RISK_ACCOUNT_MATCH"
                          : "거절 · CUSTOMER_DENIED"}
                  </strong>
                </div>
              )}
              {isProcessing && (
                <p role="status" className="text-sm mt-4 text-ink-muted">
                  서버에서 조치 결과를 확인하고 있습니다.
                </p>
              )}
              {actionError && (
                <p role="alert" className="text-sm mt-4 text-danger">
                  {actionError}
                </p>
              )}
            </Panel>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingDecision != null}
        onClose={() => setPendingDecision(null)}
        onConfirm={confirmAction}
        title="관리자 조치 확인"
        confirmLabel={
          pendingDecision === "APPROVE"
            ? "승인"
            : pendingDecision === "FRAUD_REJECT"
              ? "사기 확정 및 거절"
              : "거절"
        }
        messages={[
          pendingDecision === "APPROVE"
            ? "이 보류 이체를 승인합니다."
            : pendingDecision === "FRAUD_REJECT"
              ? "사기로 최종 확정하고 이체를 거절합니다."
              : "이 보류 이체를 거절합니다.",
          "확인 후 서버 상태를 다시 조회하며, 처리된 조치는 되돌릴 수 없습니다.",
        ]}
        items={[
          { label: "사건번호", value: fixture.caseNo },
          {
            label: "조치 사유",
            value:
              pendingDecision === "APPROVE"
                ? "CUSTOMER_CONFIRMED"
                : pendingDecision === "FRAUD_REJECT"
                  ? "FRAUD_CONFIRMED"
                  : riskMatch
                    ? "RISK_ACCOUNT_MATCH"
                    : "CUSTOMER_DENIED",
          },
        ]}
      />
    </div>
  )
}

export const FdsHeldTransferDetail = () => {
  const { heldTransferId } = useParams()
  const fixture = findFdsHeldTransfer(heldTransferId)
  const navigate = useNavigate()

  if (!fixture) {
    return (
      <EmptyState
        message="보류 거래를 찾을 수 없습니다."
        description="존재하지 않는 사건 ID입니다."
        action={
          <Button onClick={() => navigate("/admin/fds/held-transfers")}>
            목록으로
          </Button>
        }
      />
    )
  }

  // 라우트 파라미터로 다른 fixture를 열면 상세 상태를 새로 만든다.
  // effect 안에서 여러 setState를 동기 호출하지 않아 추가 렌더도 피한다.
  return <DetailContent key={fixture.id} fixture={fixture} />
}
