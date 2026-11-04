import { useEffect, useState } from "react"
import {
  Bot,
  CheckCircle2,
  Circle,
  Loader2,
  ShieldCheck,
  UserCheck,
} from "lucide-react"
import { ACTOR_COLOR } from "@/pages/demo-objection/chart-colors"
import {
  ACTOR_LABEL,
  type Actor,
  type Scenario,
} from "@/pages/demo-objection/model"
import { cn } from "@/shared/lib/utils"

const ACTOR_ICON: Record<Actor, typeof Bot> = {
  AGENT: Bot,
  SERVER: ShieldCheck,
  HUMAN: UserCheck,
}

const sec = (ms: number) => `${(ms / 1000).toFixed(1)}초`

/** 진행 중 단계의 경과 시간. 단계가 바뀌면 key 로 새로 시작한다. */
const Elapsed = ({ speed }: { speed: number }) => {
  const [ms, setMs] = useState(0)
  useEffect(() => {
    const t0 = Date.now()
    const id = window.setInterval(() => setMs((Date.now() - t0) * speed), 100)
    return () => window.clearInterval(id)
  }, [speed])
  return <>{sec(ms)}</>
}

/**
 * 진행 목록(Progress Steps 패턴). 단계마다 구체적인 이름, 결과, 소요 시간을 남긴다.
 * 수행 주체(AI, 서버 규칙, 담당자)는 색과 아이콘으로 구분한다.
 */
export const RunRail = ({
  scenario,
  index,
  running,
  speed,
  summary,
}: {
  scenario: Scenario
  index: number
  running: boolean
  speed: number
  summary: boolean
}) => {
  const agentTotal = scenario.steps.filter((s) => s.actor === "AGENT").length
  const agentDone = scenario.steps.filter(
    (s, i) => s.actor === "AGENT" && (i < index || (i === index && !running)),
  ).length

  useEffect(() => {
    document
      .querySelector(`[data-rail="${index}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [index])

  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border border-border bg-surface-elevated">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-bold text-ink">AI 분석</p>
          <p className="text-base font-bold text-ink tabular-nums">
            {agentDone} / {agentTotal}
          </p>
        </div>
        <div className="mt-2 h-1.5 w-full bg-border">
          <div
            className="h-1.5 bg-[var(--demo-series-1)] transition-all duration-500"
            style={{ width: `${(agentDone / agentTotal) * 100}%` }}
          />
        </div>
      </div>
      <ol className="min-h-0 flex-1 overflow-y-auto py-2">
        {scenario.steps.map((s, i) => {
          const done = summary || i < index || (i === index && !running)
          const current = i === index && !summary
          const Icon = ACTOR_ICON[s.actor]
          const color = ACTOR_COLOR[s.actor]
          const laneStart = i === 0 || scenario.steps[i - 1].actor !== s.actor
          return (
            <li key={i} data-rail={i}>
              {laneStart && (
                <p
                  className="mt-2 flex items-center gap-1.5 px-5 pb-1 text-xs font-bold"
                  style={{ color }}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {ACTOR_LABEL[s.actor]}
                </p>
              )}
              <div
                className={cn(
                  "mx-3 grid h-10 grid-cols-[22px_1fr_auto] items-center gap-2.5 border-l-4 px-3",
                  current && "bg-primary-tint",
                  !done && !current && "opacity-40",
                )}
                style={{
                  borderColor: done || current ? color : "var(--color-border)",
                }}
              >
                {current && running ? (
                  <Loader2
                    className="h-5 w-5 animate-spin"
                    style={{ color }}
                    aria-hidden
                  />
                ) : done ? (
                  <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
                ) : (
                  <Circle className="h-5 w-5 text-ink-faint" aria-hidden />
                )}
                <span
                  className={cn(
                    "truncate text-base",
                    current ? "font-bold text-ink" : "text-ink",
                  )}
                >
                  {s.title}
                </span>
                <span className="text-right text-xs text-ink-muted tabular-nums">
                  {current && running ? (
                    <span className="font-bold text-primary">
                      <Elapsed key={i} speed={speed} />
                    </span>
                  ) : done ? (
                    s.result
                  ) : (
                    ""
                  )}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="border-t border-border px-5 py-3 text-xs text-ink-muted">
        AI 처리 시간{" "}
        {sec(
          scenario.steps
            .filter(
              (s, i) =>
                s.actor === "AGENT" &&
                (summary || i < index || (i === index && !running)),
            )
            .reduce((sum, s) => sum + s.durationMs, 0),
        )}
      </p>
    </aside>
  )
}
