import type { ReactNode } from "react"
import {
  CheckCircle2,
  CircleDashed,
  Loader2,
  Lock,
  LockOpen,
  UserCheck,
} from "lucide-react"
import type { DemoView } from "@/pages/demo-objection/use-player"
import {
  BRANCH_LABEL,
  CLAUSE_LABEL,
  DECISION_LABEL,
  DECISION_ORDER,
  VERDICT_VIEW,
  won,
  type DecisionResult,
  type Scenario,
} from "@/pages/demo-objection/model"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { Panel, PanelHeader } from "@/shared/ui/panel"

/* ------------------------------------------------------------------ */
/* 심사 결론 — 화면 맨 위. 담당자가 가장 먼저 알아야 할 답을 한 덩어리로 */
/* ------------------------------------------------------------------ */

type ConclusionProps = {
  scenario: Scenario
  view: DemoView
  analyzing: boolean
  onAnalyze: () => void
}

export const Conclusion = ({
  scenario,
  view,
  analyzing,
  onAnalyze,
}: ConclusionProps) => {
  const { caseInfo, draft, decision } = scenario
  const confirmed = view.decision === "APPROVED"
  const account = view.accountAfter
    ? scenario.accountAfter
    : scenario.accountBefore

  return (
    <Panel>
      <div className="grid grid-cols-[1fr_300px] divide-x divide-border">
        <div className="p-5">
          {/* 첫 줄: 지금 상태를 한 문장으로 */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {confirmed ? (
              <Badge
                variant={
                  decision.result === "REJECTED"
                    ? "danger"
                    : decision.result === "SUPPLEMENT"
                      ? "warning"
                      : "success"
                }
              >
                {decision.result === "SUPPLEMENT" ? "보완 대기" : "판정 확정"}
              </Badge>
            ) : view.gate ? (
              <Badge variant="primary">판정 대기</Badge>
            ) : analyzing ? (
              <Badge variant="primary">AI 분석 중</Badge>
            ) : (
              <Badge variant="neutral">AI 분석 전</Badge>
            )}
            <span className="text-xs text-ink-faint">
              접수 {scenario.receivedAt}&nbsp;&nbsp;사유 제{scenario.clause}호{" "}
              {CLAUSE_LABEL[scenario.clause]}, {scenario.statement.reason}
            </span>
          </div>

          {confirmed ? (
            <p className="text-page leading-tight font-bold text-ink">
              {DECISION_LABEL[decision.result]}
              <span className="ml-2 text-lg font-normal text-ink-muted">
                {decision.checker
                  ? `작성 ${decision.maker}, 승인 ${decision.checker}`
                  : `확정 ${decision.maker}`}
              </span>
            </p>
          ) : view.gate ? (
            <p className="text-page leading-tight font-bold text-ink">
              {allowedSummary(scenario)}
            </p>
          ) : (
            <p className="text-page leading-tight font-bold text-ink-faint">
              {analyzing ? "AI 분석 중" : "판단 전"}
            </p>
          )}

          {view.gate && (
            <p className="mt-2 text-lg text-ink-muted">
              {scenario.plainReason}
            </p>
          )}

          <div className="mt-4 grid grid-cols-4 gap-2">
            {DECISION_ORDER.map((d) => (
              <DecisionOption
                key={d}
                result={d}
                gate={view.gate}
                allowed={scenario.allowed[d].allowed}
                reason={scenario.allowed[d].reason}
                chosen={view.decision !== "NONE" && decision.result === d}
              />
            ))}
          </div>

          {!analyzing && view.decision === "NONE" && !view.draft && (
            <div className="mt-4 flex justify-start">
              <Button variant="primary" size="md" onClick={onAnalyze}>
                AI 분석 과정 보기
              </Button>
            </div>
          )}
        </div>

        {/* 오른쪽: 기한 · AI 권고 · 계좌 */}
        <div className="flex flex-col divide-y divide-border">
          <SideRow label="통보 기한">
            {confirmed && caseInfo.dueDateAfter ? (
              <>
                <p className="text-lg font-bold text-ink">
                  {caseInfo.dueDateAfter}
                </p>
                <p className="text-xs text-ink-muted">
                  보완 연장, 원래 {caseInfo.dueDate}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-ink">{caseInfo.dueDate}</p>
                <p className="text-xs text-ink-muted">
                  D-{caseInfo.remainingBusinessDays}
                </p>
              </>
            )}
          </SideRow>
          <SideRow label="AI 권고 (제안)">
            {view.draft ? (
              <>
                <p className="text-base font-bold text-ink">
                  {BRANCH_LABEL[draft.branch]}
                </p>
                <p className="text-xs text-ink-muted">{draft.recommendation}</p>
              </>
            ) : (
              <p className="text-base text-ink-faint">분석 전</p>
            )}
          </SideRow>
          <SideRow label="계좌 상태">
            <p
              className={cn(
                "text-base font-bold",
                account.stopLabel === "전부 지급정지"
                  ? "text-danger"
                  : account.stopLabel === "일부 지급정지"
                    ? "text-warning"
                    : "text-success",
              )}
            >
              {account.stopLabel}
            </p>
            <p className="text-xs text-ink-muted">
              잔액 {won(account.balance)}, 보류 {won(account.hold)}
            </p>
            <p className="text-sm font-bold text-ink">
              출금가능 {won(account.available)}
              {view.accountAfter &&
                scenario.accountBefore.available !==
                  scenario.accountAfter.available && (
                  <span className="ml-1 text-xs text-success">
                    (0원에서 변경)
                  </span>
                )}
            </p>
          </SideRow>
        </div>
      </div>
    </Panel>
  )
}

const allowedSummary = (scenario: Scenario) => {
  const open = (["ACCEPTED", "PARTIAL"] as DecisionResult[]).filter(
    (d) => scenario.allowed[d].allowed,
  )
  if (open.length === 0) return "지급정지를 풀 근거가 없습니다"
  if (open.includes("ACCEPTED")) return "지급정지를 풀 수 있습니다"
  return "입금액만 묶고 나머지는 풀 수 있습니다"
}

const SideRow = ({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) => (
  <div className="px-4 py-3">
    <p className="mb-0.5 text-xs font-bold text-ink-faint">{label}</p>
    {children}
  </div>
)

const DecisionOption = ({
  result,
  gate,
  allowed,
  reason,
  chosen,
}: {
  result: DecisionResult
  gate: boolean
  allowed: boolean
  reason: string
  chosen: boolean
}) => {
  const open = gate && allowed
  return (
    <div
      className={cn(
        "border px-3 py-2 transition-colors duration-500",
        chosen
          ? "border-primary bg-primary-tint"
          : open
            ? "border-success bg-surface-elevated"
            : "border-border bg-surface",
      )}
    >
      <p
        className={cn(
          "flex items-center gap-1.5 text-base font-bold",
          chosen ? "text-primary" : open ? "text-success" : "text-ink-faint",
        )}
      >
        {chosen ? (
          <UserCheck className="h-4 w-4" aria-hidden />
        ) : open ? (
          <LockOpen className="h-4 w-4" aria-hidden />
        ) : (
          <Lock className="h-4 w-4" aria-hidden />
        )}
        {DECISION_LABEL[result]}
        {chosen && <span className="text-xs">선택</span>}
      </p>
      <p className="text-xs leading-snug text-ink-muted">
        {gate ? (open ? "선택 가능" : reason) : "요건 점검 후 결정"}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 고객 주장 확인표 — 화면의 핵심                                       */
/* ------------------------------------------------------------------ */

type ClaimRow = {
  id: string
  claim: string
  source: string
  record: string
  verdict?: keyof typeof VERDICT_VIEW
  note: string
}

export const ClaimCheckTable = ({
  scenario,
  view,
  running,
  started,
}: {
  scenario: Scenario
  view: DemoView
  running: boolean
  started: boolean
}) => {
  const rows: ClaimRow[] = scenario.claims
    .filter((c) => view.claims.has(c.id))
    .map((c) => {
      const link = scenario.links.find(
        (l) => l.claimId === c.id && view.links.has(l.id),
      )
      const fact = link?.factId
        ? scenario.facts.find((f) => f.id === link.factId)
        : undefined
      return {
        id: c.id,
        claim: c.text,
        source: c.source === "OCR" ? "제출 서류(OCR)" : "신청서",
        record: link ? (fact ? fact.text : "해당하는 기록 없음") : "",
        verdict: link?.verdict,
        note: link?.note ?? "",
      }
    })

  const columns: DataGridColumn<ClaimRow>[] = [
    { key: "id", header: "No", align: "center", width: 56 },
    {
      key: "claim",
      header: "고객 주장",
      render: (r) => <span className="font-bold text-ink">{r.claim}</span>,
    },
    { key: "source", header: "출처", align: "center", width: 130 },
    {
      key: "record",
      header: "확인한 기록",
      render: (r) =>
        r.verdict ? (
          <span className="text-ink">{r.record}</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-ink-faint">
            {running ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <CircleDashed className="h-3.5 w-3.5" aria-hidden />
            )}
            확인 중
          </span>
        ),
    },
    {
      key: "verdict",
      header: "결과",
      align: "center",
      width: 130,
      render: (r) =>
        r.verdict ? (
          <Badge variant={VERDICT_VIEW[r.verdict].badge}>
            {VERDICT_VIEW[r.verdict].label}
          </Badge>
        ) : (
          "-"
        ),
    },
    {
      key: "note",
      header: "설명",
      render: (r) => <span className="text-ink-muted">{r.note}</span>,
    },
  ]

  return (
    <DataGrid
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      emptyMessage={started ? "AI 분석 중" : "AI 분석 전"}
    />
  )
}

/* ------------------------------------------------------------------ */
/* AI가 처리한 일 / 담당자가 할 일                                      */
/* ------------------------------------------------------------------ */

export const WorkSplit = ({
  scenario,
  index,
  running,
  view,
}: {
  scenario: Scenario
  index: number
  running: boolean
  view: DemoView
}) => {
  const agentDone = scenario.steps.filter(
    (s, i) => s.actor === "AGENT" && (i < index || (i === index && !running)),
  )
  const agentTotal = scenario.steps.filter((s) => s.actor === "AGENT").length
  const humanTodo = view.draft
    ? [
        ...scenario.draft.questions,
        "판정 선택과 사유 입력",
        ...(scenario.decision.checker ? ["다른 담당자의 승인"] : []),
      ]
    : []

  return (
    <div className="grid grid-cols-2 gap-3">
      <Panel>
        <PanelHeader
          title={`AI가 미리 처리한 일 ${agentDone.length} / ${agentTotal}`}
          className="border-b border-border"
        />
        <ul className="flex flex-col gap-1.5 px-4 py-3">
          {agentDone.length === 0 && (
            <li className="text-xs text-ink-faint">아직 없음</li>
          )}
          {agentDone.map((s) => (
            <li
              key={s.title}
              className="flex items-start gap-2 text-base text-ink"
            >
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-success"
                aria-hidden
              />
              {s.title}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel>
        <PanelHeader
          title={`담당자가 할 일 ${humanTodo.length}건`}
          className="border-b border-border"
        />
        <ul className="flex flex-col gap-1.5 px-4 py-3">
          {humanTodo.length === 0 && (
            <li className="text-xs text-ink-faint">
              AI 판정안이 나오면 정리됩니다
            </li>
          )}
          {humanTodo.map((t) => (
            <li key={t} className="flex items-start gap-2 text-base text-ink">
              <CircleDashed
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                aria-hidden
              />
              {t}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
