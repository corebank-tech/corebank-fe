import * as React from "react"
import { RotateCcw } from "lucide-react"
import {
  AGENT_RUN_STATUS_LABEL,
  GATE_BRANCH_LABEL,
  gateComparisonOf,
  isRunActive,
  labelOf,
  toTimelineStep,
  useAgentRunSteps,
  useAgentRuns,
  useRequestObjectionReview,
  useReviewDraft,
  TransactionNumberList,
  type AgentRun,
  type ReviewDraft,
} from "@/entities/payment-stop"
import { toErrorMessage } from "@/shared/api/api-error"
import { formatDateTime } from "@/shared/lib/format"
import { useIdempotencyKey } from "@/shared/lib/hooks/use-idempotency-key"
import {
  AgentRunTimeline,
  formatStepDuration,
} from "@/shared/ui/agent-run-timeline"
import { Alert } from "@/shared/ui/alert"
import { Badge, type BadgeVariant } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Panel, PanelHeader } from "@/shared/ui/panel"

type Props = {
  objectionId: number
  /** 판정이 확정됐는가. 확정 뒤에는 재분석을 요청하지 않는다(서버 `PST0302`) */
  isDecided: boolean
  /** 재분석 요청 권한(`PAYMENT_STOP_WRITE`). 없으면 버튼을 그리지 않는다 */
  canRequest: boolean
}

const RUN_STATUS_TONE: Record<string, BadgeVariant> = {
  QUEUED: "neutral",
  RUNNING: "primary",
  COMPLETED: "success",
  FAILED: "danger",
}

const MICRO_USD_PER_USD = 1_000_000

const formatCost = (costMicroUsd: number) =>
  `$${(costMicroUsd / MICRO_USD_PER_USD).toFixed(4)}`

/** 실행 한 번에 걸린 시간. 끝나지 않았으면 `null` 이다. */
const runDuration = (run: AgentRun): string | null => {
  if (!run.startedAt || !run.endedAt) return null
  return formatStepDuration(
    new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime(),
  )
}

const DraftRow = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <div className="border-t border-border px-4 py-3">
    <p className="mb-1 text-xs font-bold text-ink-faint">{label}</p>
    <div className="text-base text-ink">{children}</div>
  </div>
)

const EmptyText = ({ children }: { children: React.ReactNode }) => (
  <span className="text-ink-faint">{children}</span>
)

/**
 * AI 판정안. 심사 참고안이고 해제 근거가 아니다(D9). 해제 요건 점검은 서버가 원장으로
 * 다시 계산하고, 그 결과가 판정안 갈래와 다르면 경고한다.
 */
const DraftPanel = ({
  draft,
  comparison,
}: {
  draft: ReviewDraft | null
  comparison: { branch: string; agentBranch: string } | null
}) => (
  <Panel aria-label="AI 판정안">
    <PanelHeader
      title="AI 판정안"
      action={
        draft && (
          <Badge variant="coolViolet">
            {labelOf(GATE_BRANCH_LABEL, draft.branch)}
          </Badge>
        )
      }
    />
    <div className="px-4 pb-3">
      <Alert variant="info">
        AI 판정안은 심사 참고안이며 지급정지 해제 근거로 쓰이지 않습니다.
      </Alert>
      {comparison && comparison.branch !== comparison.agentBranch && (
        <Alert
          variant="warning"
          title="서버 규칙 결과와 AI 판정안이 다름"
          className="mt-2"
        >
          서버 규칙은 {labelOf(GATE_BRANCH_LABEL, comparison.branch)}, AI
          판정안은 {labelOf(GATE_BRANCH_LABEL, comparison.agentBranch)}입니다.
          해제 여부는 서버 규칙 결과와 담당자 판정으로 정합니다.
        </Alert>
      )}
    </div>
    {draft ? (
      <>
        <DraftRow label="근거 거래">
          {draft.evidenceTransactionNumbers.length > 0 ? (
            <TransactionNumberList numbers={draft.evidenceTransactionNumbers} />
          ) : (
            <EmptyText>없음</EmptyText>
          )}
        </DraftRow>
        {draft.claims.length > 0 && (
          <DraftRow label="정리한 주장">
            <ul className="flex flex-col gap-1.5">
              {draft.claims.map((claim) => (
                <li key={claim.text}>
                  {claim.text}
                  {claim.quote && (
                    <span className="mt-0.5 block border-l-2 border-border pl-2 text-xs text-ink-muted">
                      {claim.quote}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </DraftRow>
        )}
        {draft.contradictions.length > 0 && (
          <DraftRow label="주장과 원장의 차이">
            <ul className="flex flex-col gap-2">
              {draft.contradictions.map((item, index) => (
                <li key={index} className="text-sm">
                  {item.claim && <p>주장: {item.claim}</p>}
                  {item.fact && (
                    <p className="text-ink-muted">원장 기록: {item.fact}</p>
                  )}
                  {item.transactionNumbers.length > 0 && (
                    <TransactionNumberList numbers={item.transactionNumbers} />
                  )}
                </li>
              ))}
            </ul>
          </DraftRow>
        )}
        <DraftRow label="누락 소명자료">
          {draft.missingDocuments.length > 0 ? (
            <ul className="list-inside list-disc">
              {draft.missingDocuments.map((document) => (
                <li key={document}>{document}</li>
              ))}
            </ul>
          ) : (
            <EmptyText>없음</EmptyText>
          )}
        </DraftRow>
        <DraftRow label="추가 확인">
          {draft.followUps.length > 0 ? (
            <ul className="list-inside list-disc">
              {draft.followUps.map((followUp) => (
                <li key={followUp}>{followUp}</li>
              ))}
            </ul>
          ) : (
            <EmptyText>없음</EmptyText>
          )}
        </DraftRow>
        <DraftRow label="안내문 초안">
          {draft.noticeDraft ? (
            <p className="text-sm bg-surface px-3 py-2 leading-relaxed whitespace-pre-wrap">
              {draft.noticeDraft}
            </p>
          ) : (
            <EmptyText>없음</EmptyText>
          )}
        </DraftRow>
      </>
    ) : (
      <p className="border-t border-border px-4 py-6 text-center text-base text-ink-faint">
        AI 분석이 끝나면 판정안이 표시됩니다.
      </p>
    )}
  </Panel>
)

/**
 * AI 분석 실행 타임라인과 판정안(계획 PA-07, D20, D21 ①②).
 *
 * 실행 목록과 단계를 1초마다 받아 단계가 하나씩 붙는 모습을 보인다. 실행이 끝나면 폴링을
 * 멈춘다. 분석이 실패해도 판정 확정은 이 영역과 무관하게 할 수 있다 — AI 분석은 판정의
 * 전제가 아니다.
 */
export const AgentAnalysis = ({
  objectionId,
  isDecided,
  canRequest,
}: Props) => {
  const {
    latestRun,
    isError: isRunsError,
    error: runsError,
  } = useAgentRuns(objectionId)
  const isActive = isRunActive(latestRun?.status)
  const { steps } = useAgentRunSteps(
    objectionId,
    latestRun?.runId ?? null,
    latestRun != null && !isActive,
  )
  const { draft } = useReviewDraft(objectionId, latestRun)
  const requestReview = useRequestObjectionReview()
  const idempotency = useIdempotencyKey()
  const [requestError, setRequestError] = React.useState<string | null>(null)

  const timelineSteps = steps.map(toTimelineStep)
  const comparison = gateComparisonOf(steps)
  const duration = latestRun ? runDuration(latestRun) : null

  const requestDisabledReason = (() => {
    if (isDecided) return "판정이 확정된 이의제기는 다시 분석하지 않습니다."
    if (isActive) return "진행 중인 분석이 끝난 뒤 요청할 수 있습니다."
    return null
  })()

  const handleRequest = () => {
    setRequestError(null)
    const idempotencyKey = idempotency.keyFor({ objectionId })
    requestReview.mutate(
      { objectionId, idempotencyKey },
      {
        onSuccess: () => idempotency.reset(),
        onError: (error) => setRequestError(toErrorMessage(error)),
      },
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {latestRun ? (
          <>
            <Badge variant={RUN_STATUS_TONE[latestRun.status] ?? "neutral"}>
              {labelOf(AGENT_RUN_STATUS_LABEL, latestRun.status)}
            </Badge>
            <span className="text-xs text-ink-muted">
              {latestRun.attempt > 0 && `${latestRun.attempt}회차 시도`}
              {latestRun.queuedAt &&
                `, 요청 ${formatDateTime(latestRun.queuedAt)}`}
              {duration && `, 소요 ${duration}`}
            </span>
          </>
        ) : (
          <span className="text-xs text-ink-muted">
            {isRunsError
              ? toErrorMessage(runsError)
              : "아직 요청된 분석이 없습니다."}
          </span>
        )}
        {canRequest && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            disabled={requestDisabledReason != null || requestReview.isPending}
            title={requestDisabledReason ?? undefined}
            onClick={handleRequest}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            재분석 요청
          </Button>
        )}
      </div>

      {requestError && <Alert variant="danger">{requestError}</Alert>}
      {latestRun?.status === "FAILED" && (
        <Alert variant="warning" title="AI 분석 중단">
          AI 분석이 끝나지 못했습니다. 판정은 해제 요건 점검과 담당자 검토로
          계속할 수 있습니다.
          {latestRun.failureReason && ` 사유: ${latestRun.failureReason}`}
        </Alert>
      )}

      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-4">
        <Panel aria-label="AI 분석 실행 타임라인">
          <PanelHeader
            title="실행 단계"
            action={
              <span className="text-xs text-ink-muted tabular-nums">
                {timelineSteps.length}단계
                {latestRun?.costMicroUsd != null &&
                  `, 비용 ${formatCost(latestRun.costMicroUsd)}`}
              </span>
            }
          />
          <div className="border-t border-border px-4 py-3">
            <AgentRunTimeline
              steps={timelineSteps}
              isActive={isActive}
              emptyMessage="표시할 분석 단계가 없습니다."
            />
          </div>
          <p className="border-t border-border px-4 py-2 text-2xs text-ink-faint">
            AI 권한: 이 이의제기의 소명과 원장 조회, 판정안 제출만 가능
          </p>
        </Panel>
        <DraftPanel draft={draft} comparison={comparison} />
      </div>
    </div>
  )
}
