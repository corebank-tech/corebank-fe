import * as React from "react"
import {
  Bot,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Wrench,
  XCircle,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { formatStepDuration } from "@/shared/ui/agent-run-timeline/format-step-duration"

/**
 * AI Agent 실행 타임라인(`corebank-server` `docs/phase2/agent_run_step_schema.md`).
 *
 * 업무와 무관한 화면 부품이다. 단계 종류(`type`)를 어떤 이름으로 부를지, 어느 단계가
 * 서버 규칙인지는 쓰는 쪽이 정해 넘긴다. 지급정지 이의제기 Agent가 먼저 쓰고, 같은
 * 단계 이벤트 형식을 쓰는 다른 Agent(P6 FDS)도 그대로 쓰도록 `shared/ui` 에 둔다(계획 D23).
 *
 * 단계는 받은 순서대로 아래에 붙는다. 새로 붙은 단계만 나타나는 움직임을 갖는다 —
 * 이미 그려진 단계는 다시 마운트되지 않으므로 움직이지 않는다.
 */

/** 단계를 남긴 주체. AI 판단과 서버 규칙 계산을 색과 아이콘으로 가른다. */
export type AgentRunActor = "AGENT" | "SERVER"

export type AgentRunStepStatus = "RUNNING" | "DONE" | "FAILED"

/** 단계 아래에 붙는 상세 카드. 도구 호출이면 도구, 이유, 결과 요약, 근거 거래가 들어간다. */
export type AgentRunStepCard = {
  title: string
  rows: { label: string; value: React.ReactNode }[]
}

export type AgentRunTimelineStep = {
  seq: number
  actor: AgentRunActor
  /** 단계 종류의 화면 이름(예: 원장 조회) */
  typeLabel: string
  title: string
  summary: string
  status: AgentRunStepStatus
  /** 시각 문자열. 끝나지 않은 단계는 `endedAt` 이 `null` 이다 */
  startedAt: string | null
  endedAt: string | null
  card?: AgentRunStepCard
}

type Props = {
  steps: AgentRunTimelineStep[]
  /** 실행이 아직 끝나지 않았는가. 마지막 단계 뒤에 "진행 중" 줄을 그린다 */
  isActive: boolean
  /** 단계가 하나도 없을 때의 문구 */
  emptyMessage: string
}

const ACTOR_LABEL: Record<AgentRunActor, string> = {
  AGENT: "AI Agent",
  SERVER: "서버 규칙",
}

const ACTOR_ICON: Record<AgentRunActor, typeof Bot> = {
  AGENT: Bot,
  SERVER: ShieldCheck,
}

/** 주체별 색. 왼쪽 선과 주체 표시에 같이 쓴다. */
const ACTOR_TONE: Record<AgentRunActor, { line: string; text: string }> = {
  AGENT: { line: "border-primary", text: "text-primary" },
  SERVER: { line: "border-cool-violet", text: "text-cool-violet" },
}

/** 진행 중 단계의 경과 시간을 다시 그리는 간격 */
const ELAPSED_TICK_MS = 200

const toMillis = (value: string | null): number | null => {
  if (!value) return null
  const millis = new Date(value).getTime()
  return Number.isNaN(millis) ? null : millis
}

/** 진행 중 단계의 경과 시간. 서버 시작 시각부터 센다. */
const Elapsed = ({ startedAt }: { startedAt: string | null }) => {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ELAPSED_TICK_MS)
    return () => window.clearInterval(id)
  }, [])
  const start = toMillis(startedAt)
  if (start == null) return null
  return <>{formatStepDuration(now - start)}</>
}

const StepIcon = ({
  status,
  actor,
}: {
  status: AgentRunStepStatus
  actor: AgentRunActor
}) => {
  if (status === "RUNNING") {
    return (
      <Loader2
        className={cn("h-5 w-5 animate-spin", ACTOR_TONE[actor].text)}
        aria-label="진행 중"
      />
    )
  }
  if (status === "FAILED") {
    return <XCircle className="h-5 w-5 text-danger" aria-label="중단" />
  }
  return <CheckCircle2 className="h-5 w-5 text-success" aria-label="완료" />
}

const StepCard = ({ card }: { card: AgentRunStepCard }) => (
  <div className="mt-2 border-l-2 border-primary bg-surface px-3 py-2 text-xs leading-relaxed">
    <p className="mb-1 flex items-center gap-1 font-bold text-ink">
      <Wrench className="h-3.5 w-3.5" aria-hidden />
      {card.title}
    </p>
    <dl className="grid grid-cols-[72px_1fr] gap-x-2 gap-y-0.5">
      {card.rows.map((row) => (
        <React.Fragment key={row.label}>
          <dt className="font-bold text-ink">{row.label}</dt>
          <dd className="min-w-0 break-words text-ink-muted">{row.value}</dd>
        </React.Fragment>
      ))}
    </dl>
  </div>
)

export const AgentRunTimeline = ({ steps, isActive, emptyMessage }: Props) => {
  const lastStep = steps.at(-1)
  // 단계 사이(앞 단계는 끝났고 다음 단계는 아직 안 온 때)에도 실행이 살아 있음을 보인다.
  const isWaitingNext = isActive && lastStep?.status !== "RUNNING"

  if (steps.length === 0 && !isActive) {
    return (
      <p className="py-6 text-center text-base text-ink-faint">
        {emptyMessage}
      </p>
    )
  }

  return (
    <ol className="flex flex-col" aria-label="AI 분석 단계">
      {steps.map((step, index) => {
        const Icon = ACTOR_ICON[step.actor]
        const tone = ACTOR_TONE[step.actor]
        const isLaneStart = index === 0 || steps[index - 1].actor !== step.actor
        const start = toMillis(step.startedAt)
        const end = toMillis(step.endedAt)
        return (
          <li
            key={step.seq}
            data-seq={step.seq}
            className="animate-step-in motion-reduce:animate-none"
          >
            {isLaneStart && (
              <p
                className={cn(
                  "mt-2 flex items-center gap-1.5 pb-1 text-xs font-bold first:mt-0",
                  tone.text,
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {ACTOR_LABEL[step.actor]}
              </p>
            )}
            <div
              className={cn(
                "grid grid-cols-[22px_1fr_auto] gap-x-2.5 border-l-4 px-3 py-2.5",
                tone.line,
                step.status === "RUNNING" && "bg-primary-tint",
                step.status === "FAILED" && "border-danger bg-danger-tint",
              )}
            >
              <span className="pt-0.5">
                <StepIcon status={step.status} actor={step.actor} />
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-ink">
                    {step.title}
                  </span>
                  <span className="rounded-sm border border-border bg-surface-elevated px-1.5 text-2xs text-ink-muted">
                    {step.typeLabel}
                  </span>
                </p>
                {step.summary && (
                  <p
                    className={cn(
                      "mt-0.5 text-xs leading-relaxed",
                      step.status === "FAILED"
                        ? "text-danger"
                        : "text-ink-muted",
                    )}
                  >
                    {step.summary}
                  </p>
                )}
                {step.card && <StepCard card={step.card} />}
              </div>
              <span className="pt-0.5 text-right text-xs text-ink-muted tabular-nums">
                {step.status === "RUNNING" ? (
                  <span className="font-bold text-primary">
                    <Elapsed startedAt={step.startedAt} />
                  </span>
                ) : start != null && end != null ? (
                  formatStepDuration(end - start)
                ) : null}
              </span>
            </div>
          </li>
        )
      })}
      {isWaitingNext && (
        <li
          className="mt-2 flex items-center gap-2 px-3 py-2 text-xs text-ink-muted"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
          {steps.length === 0 ? "분석 대기 중" : "다음 단계 진행 중"}
        </li>
      )}
    </ol>
  )
}
