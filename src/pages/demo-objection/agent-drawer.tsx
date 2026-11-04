import { CheckCircle2, Circle, Loader2, Search, X } from "lucide-react"
import type { Scenario } from "@/pages/demo-objection/model"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/ui/badge"

type Props = {
  scenario: Scenario
  index: number
  running: boolean
  onClose: () => void
}

/** 서랍 위쪽의 작은 진행 표시 — AI가 하는 일만 6칸 */
const PHASES: {
  label: string
  match: (title: string, stage: string) => boolean
}[] = [
  {
    label: "소명 읽기",
    match: (t, s) => s === "INTAKE" || t.startsWith("소명"),
  },
  { label: "서류 OCR", match: (_t, s) => s === "OCR" },
  {
    label: "주장 추출",
    match: (t) => t.includes("주장") && t.includes("추출"),
  },
  { label: "거래 기록 조회", match: (_t, s) => s === "LEDGER" },
  { label: "외부 조회", match: (_t, s) => s === "EXTERNAL" },
  { label: "판정안 작성", match: (_t, s) => s === "DRAFT" },
]

/**
 * AI 분석 실시간 보기. 단계 이벤트(agent_run_step)가 도착하는 대로 한 줄씩 붙는다.
 * 실제 구현은 1초 폴링으로 새 이벤트만 받는다(PLAN D20).
 */
export const AgentDrawer = ({ scenario, index, running, onClose }: Props) => {
  const agentSteps = scenario.steps
    .map((s, i) => ({ ...s, i }))
    .filter((s) => s.actor === "AGENT" && s.i <= index)
  const allAgentDone = scenario.steps.every(
    (s, i) => s.actor !== "AGENT" || i < index || (i === index && !running),
  )
  const doneSteps = scenario.steps.filter(
    (s, i) => s.actor === "AGENT" && (i < index || (i === index && !running)),
  )
  const current = index >= 0 ? scenario.steps[index] : undefined

  const phaseState = (p: (typeof PHASES)[number]) => {
    const all = scenario.steps.filter(
      (s) => s.actor === "AGENT" && p.match(s.title, s.stage),
    )
    if (all.length === 0) return "skip"
    if (
      current &&
      current.actor === "AGENT" &&
      running &&
      p.match(current.title, current.stage)
    )
      return "run"
    if (all.every((s) => doneSteps.includes(s))) return "done"
    return "wait"
  }

  return (
    <aside className="flex w-[400px] shrink-0 flex-col border border-border bg-surface-elevated">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-ink">AI 분석 진행</h2>
          {allAgentDone ? (
            <Badge variant="success">완료</Badge>
          ) : (
            <Badge variant="primary">실시간</Badge>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="text-ink-faint hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 6칸 진행 표시 */}
      <ol className="grid grid-cols-6 border-b border-border">
        {PHASES.map((p) => {
          const st = phaseState(p)
          return (
            <li
              key={p.label}
              className={cn(
                "flex flex-col items-center gap-1 border-r border-border px-1 py-2 text-center text-[11px] last:border-r-0",
                st === "done" && "bg-success-tint text-success",
                st === "run" && "bg-primary-tint font-bold text-primary",
                (st === "wait" || st === "skip") && "text-ink-faint",
              )}
            >
              {st === "done" ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              ) : st === "run" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Circle className="h-4 w-4" aria-hidden />
              )}
              <span className="leading-tight">
                {st === "skip" ? `${p.label}(없음)` : p.label}
              </span>
            </li>
          )
        })}
      </ol>

      <ol className="flex-1 overflow-y-auto px-4 py-3">
        {agentSteps.length === 0 && (
          <li className="py-6 text-center text-xs text-ink-faint">
            분석 대기 중
          </li>
        )}
        {agentSteps.map((s) => {
          const isRunning = s.i === index && running
          return (
            <li
              key={s.i}
              className="demo-pop border-b border-border py-2.5 last:border-b-0"
            >
              <p className="flex items-start gap-2 text-base font-bold text-ink">
                {isRunning ? (
                  <Loader2
                    className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary"
                    aria-hidden
                  />
                ) : (
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-success"
                    aria-hidden
                  />
                )}
                {s.title}
              </p>
              {s.tool && (
                <div className="mt-1.5 ml-6 border-l-2 border-primary bg-surface px-3 py-2 text-xs leading-relaxed">
                  <p className="flex items-center gap-1 font-bold text-ink">
                    <Search className="h-3.5 w-3.5" aria-hidden />
                    <code className="font-mono">{s.tool.name}</code>
                  </p>
                  <p className="text-ink-muted">
                    <b className="text-ink">이유</b> {s.tool.reason}
                  </p>
                  <p className="text-ink-muted">
                    <b className="text-ink">조건</b> {s.tool.args}
                  </p>
                  <p className="text-ink-muted">
                    <b className="text-ink">결과</b>{" "}
                    {isRunning ? (
                      <span className="demo-pulse">조회 중…</span>
                    ) : (
                      s.tool.result
                    )}
                  </p>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <p className="border-t border-border px-4 py-2.5 text-xs leading-relaxed text-ink-faint">
        AI 권한: 이 사건 조회만 가능
      </p>
    </aside>
  )
}
