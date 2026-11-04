import { EvidenceChart } from "@/pages/demo-objection/evidence-chart"
import {
  DOC_STATUS,
  won,
  type GateRule,
  type LedgerTx,
  type RuleResult,
  type Scenario,
} from "@/pages/demo-objection/model"
import { StatementDocument } from "@/pages/demo-objection/statement-document"
import type { DemoView } from "@/pages/demo-objection/use-player"
import { cn } from "@/shared/lib/utils"
import { Badge, type BadgeVariant } from "@/shared/ui/badge"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"

export type TabId = "document" | "ledger" | "rules" | "agent" | "history"

const TABS: { id: TabId; label: string }[] = [
  { id: "document", label: "신청서와 서류" },
  { id: "ledger", label: "거래 내역" },
  { id: "rules", label: "해제 요건 점검" },
  { id: "agent", label: "AI 분석 기록" },
  { id: "history", label: "처리 이력" },
]

export const TabBar = ({
  active,
  onChange,
  badges,
}: {
  active: TabId
  onChange: (id: TabId) => void
  badges: Partial<Record<TabId, string>>
}) => (
  <div className="flex border-b-2 border-navy" role="tablist">
    {TABS.map((t) => (
      <button
        key={t.id}
        type="button"
        role="tab"
        aria-selected={active === t.id}
        onClick={() => onChange(t.id)}
        className={cn(
          "-mb-0.5 flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-base",
          active === t.id
            ? "border-primary font-bold text-primary"
            : "border-transparent text-ink-muted hover:text-ink",
        )}
      >
        {t.label}
        {badges[t.id] && <Badge variant="primary">{badges[t.id]}</Badge>}
      </button>
    ))}
  </div>
)

type TabContentProps = {
  tab: TabId
  scenario: Scenario
  view: DemoView
  index: number
  running: boolean
  hoveredField?: string
  onHoverField: (id?: string) => void
}

export const TabContent = (p: TabContentProps) => {
  switch (p.tab) {
    case "document":
      return (
        <div className="flex flex-col gap-4">
          <DataGrid
            columns={[
              { key: "name", header: "제출 서류" },
              {
                key: "status",
                header: "상태",
                align: "center",
                width: 140,
                render: (d) => (
                  <Badge variant={DOC_STATUS[d.status].badge}>
                    {DOC_STATUS[d.status].label}
                  </Badge>
                ),
              },
              { key: "note", header: "비고", render: (d) => d.note ?? "" },
            ]}
            rows={p.scenario.documents}
            rowKey={(d) => d.name}
          />
          <StatementDocument
            scenario={p.scenario}
            injection={p.view.injection}
            documentFields={p.view.documentFields}
            hoveredField={p.hoveredField}
            onHoverField={p.onHoverField}
          />
        </div>
      )
    case "ledger":
      return <LedgerTab scenario={p.scenario} view={p.view} />
    case "rules":
      return <RulesTab scenario={p.scenario} gate={p.view.gate} />
    case "agent":
      return (
        <AgentLogTab
          scenario={p.scenario}
          index={p.index}
          running={p.running}
        />
      )
    case "history":
      return (
        <HistoryTab scenario={p.scenario} index={p.index} running={p.running} />
      )
  }
}

const LedgerTab = ({
  scenario,
  view,
}: {
  scenario: Scenario
  view: DemoView
}) => {
  if (!view.ledger) {
    return (
      <p className="py-10 text-center text-base text-ink-faint">
        거래 기록 조회 전
      </p>
    )
  }
  const disputedAt =
    scenario.ledger.find((t) => t.kind === "DISPUTED")?.at ?? ""
  const columns: DataGridColumn<LedgerTx>[] = [
    {
      key: "at",
      header: "거래 일시",
      align: "center",
      width: 160,
      render: (t) => t.at.replace("T", " "),
    },
    {
      key: "dir",
      header: "구분",
      align: "center",
      width: 80,
      render: (t) =>
        t.dir === "IN" ? "입금" : t.interbank ? "타행 출금" : "출금",
    },
    { key: "counterparty", header: "상대", width: 160 },
    {
      key: "amount",
      header: "금액",
      align: "right",
      width: 130,
      render: (t) => won(t.amount),
    },
    { key: "note", header: "내용", render: (t) => t.note ?? "" },
    {
      key: "basis",
      header: "정상 근거로 사용",
      align: "center",
      width: 170,
      render: (t) =>
        t.kind === "DISPUTED" ? (
          <Badge variant="warning">제외, 다툼 입금</Badge>
        ) : t.afterDispute || t.at > disputedAt ? (
          <Badge variant="warning">제외, 다툼 이후</Badge>
        ) : (
          <Badge variant="neutral">사용</Badge>
        ),
    },
  ]
  return (
    <div className="flex flex-col gap-4">
      <EvidenceChart scenario={scenario} />
      <DataGrid columns={columns} rows={scenario.ledger} rowKey={(t) => t.id} />
    </div>
  )
}

const RULE_BADGE: Record<RuleResult, { label: string; variant: BadgeVariant }> =
  {
    PASS: { label: "충족", variant: "success" },
    FAIL: { label: "미충족", variant: "neutral" },
    NA: { label: "해당 없음", variant: "neutral" },
    APPLIED: { label: "적용", variant: "warning" },
  }

const RulesTab = ({
  scenario,
  gate,
}: {
  scenario: Scenario
  gate: boolean
}) => {
  const columns: DataGridColumn<GateRule>[] = [
    {
      key: "label",
      header: "점검 항목",
      width: 220,
      render: (r) => <span className="font-bold text-ink">{r.label}</span>,
    },
    {
      key: "condition",
      header: "기준",
      render: (r) => <span className="text-ink-muted">{r.condition}</span>,
    },
    {
      key: "basis",
      header: "근거",
      width: 190,
      render: (r) => (
        <span
          className={r.basis.startsWith("내부") ? "text-ink-faint" : "text-ink"}
        >
          {r.basis}
        </span>
      ),
    },
    {
      key: "result",
      header: "결과",
      align: "center",
      width: 110,
      render: (r) =>
        gate ? (
          <Badge variant={RULE_BADGE[r.result].variant}>
            {RULE_BADGE[r.result].label}
          </Badge>
        ) : (
          <span className="text-ink-faint">점검 전</span>
        ),
    },
    {
      key: "detail",
      header: "내용",
      width: 320,
      render: (r) => (gate ? r.detail : ""),
    },
  ]
  return (
    <div className="flex flex-col gap-2">
      <DataGrid
        columns={columns}
        rows={scenario.gateRules}
        rowKey={(r) => r.id}
      />
    </div>
  )
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}초`

const AgentLogTab = ({
  scenario,
  index,
  running,
}: {
  scenario: Scenario
  index: number
  running: boolean
}) => {
  const rows = scenario.steps
    .map((s, i) => ({ ...s, i }))
    .filter(
      (s) =>
        s.actor === "AGENT" && (s.i < index || (s.i === index && !running)),
    )
  return (
    <DataGrid
      columns={[
        {
          key: "i",
          header: "No",
          align: "center",
          width: 56,
          render: (_r, n) => n + 1,
        },
        {
          key: "title",
          header: "처리 내용",
          render: (r) => <span className="font-bold text-ink">{r.title}</span>,
        },
        {
          key: "tool",
          header: "조회 조건과 결과",
          render: (r) =>
            r.tool ? (
              <span className="text-ink-muted">
                {r.tool.args} → {r.tool.result}
              </span>
            ) : (
              "-"
            ),
        },
        {
          key: "d",
          header: "소요",
          align: "center",
          width: 80,
          render: (r) => seconds(r.durationMs),
        },
      ]}
      rows={rows}
      rowKey={(r) => String(r.i)}
      emptyMessage="AI 분석 기록이 없습니다."
    />
  )
}

/** 처리 이력 — 감사 기록 모양. 시각은 시연용으로 11/6 10:00 부터 누적한다. */
const HistoryTab = ({
  scenario,
  index,
  running,
}: {
  scenario: Scenario
  index: number
  running: boolean
}) => {
  const base = new Date("2026-11-06T10:00:00").getTime()
  const rows = scenario.steps
    .map((s, i) => ({
      ...s,
      i,
      at: new Date(
        base +
          scenario.steps
            .slice(0, i + 1)
            .reduce((sum, x) => sum + x.durationMs, 0),
      ),
    }))
    .filter((s) => s.i < index || (s.i === index && !running))
  const fmt = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
  const actorName = (a: string, title: string) =>
    a === "HUMAN"
      ? title.startsWith("승인") && scenario.decision.checker
        ? scenario.decision.checker
        : scenario.decision.maker
      : a === "AGENT"
        ? "AI 분석(작업 토큰)"
        : "해제 요건 점검"
  return (
    <DataGrid
      columns={[
        {
          key: "at",
          header: "일시",
          align: "center",
          width: 140,
          render: (r) => fmt(r.at),
        },
        {
          key: "actor",
          header: "수행 주체",
          align: "center",
          width: 160,
          render: (r) => `${actorName(r.actor, r.title)}`,
        },
        { key: "title", header: "내용" },
      ]}
      rows={rows}
      rowKey={(r) => String(r.i)}
      emptyMessage="처리 이력이 없습니다."
    />
  )
}
