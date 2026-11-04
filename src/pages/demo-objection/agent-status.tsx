import { useEffect, useState } from "react"
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Circle,
  Loader2,
  ShieldCheck,
  UserCheck,
} from "lucide-react"
import type { Scenario, StageId } from "@/pages/demo-objection/model"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"

/** 단계별 진행 중 문구 */
const DOING: Record<StageId, string> = {
  INTAKE: "입력 확인 중",
  OCR: "서류 읽는 중",
  CLAIMS: "고객 주장 정리 중",
  LEDGER: "거래 기록 확인 중",
  EXTERNAL: "외부 기관 조회 중",
  DRAFT: "판정안 작성 중",
  GATE: "해제 요건 점검 중",
  DECISION: "담당자 판정 중",
  ACCOUNT: "계좌 반영 중",
}

type Input = { label: string; stages: StageId[] }

/** AI 에 들어가는 입력. 시나리오에 없는 입력은 빼고 보여 준다 */
const inputsOf = (s: Scenario): Input[] => [
  { label: "신청서", stages: ["CLAIMS"] },
  ...(s.document ? [{ label: "서류 OCR", stages: ["OCR"] as StageId[] }] : []),
  { label: "거래 기록", stages: ["LEDGER"] },
  ...(s.steps.some((st) => st.stage === "EXTERNAL")
    ? [{ label: "외부 조회", stages: ["EXTERNAL"] as StageId[] }]
    : []),
]

/** AI 누적 작업 시간. 진행 중인 AI 단계는 실시간으로 더한다 */
const useAiSeconds = (
  scenario: Scenario,
  index: number,
  running: boolean,
  speed: number,
) => {
  const base = scenario.steps
    .filter(
      (s, i) => s.actor === "AGENT" && (i < index || (i === index && !running)),
    )
    .reduce((sum, s) => sum + s.durationMs, 0)
  const live = running && scenario.steps[index]?.actor === "AGENT"
  const [extra, setExtra] = useState(0)
  useEffect(() => {
    if (!live) return
    const t0 = Date.now()
    const id = window.setInterval(
      () => setExtra((Date.now() - t0) * speed),
      100,
    )
    return () => {
      window.clearInterval(id)
      setExtra(0)
    }
  }, [live, index, speed])
  return ((base + (live ? extra : 0)) / 1000).toFixed(1)
}

/**
 * 분석 화면 위쪽 상태 줄. AI 가 지금 무엇을 하는지, 얼마나 일했는지, 어떤 입력을 썼는지를
 * 발표자가 넘기지 않아도 계속 바뀌게 보여 준다. 담당자 차례가 되면 판정 버튼이 나온다.
 */
export const AgentStatus = ({
  scenario,
  index,
  running,
  speed,
  waitingHuman,
  isDone,
  onHuman,
}: {
  scenario: Scenario
  index: number
  running: boolean
  speed: number
  waitingHuman: boolean
  isDone: boolean
  onHuman: () => void
}) => {
  const step = scenario.steps[index]
  const seconds = useAiSeconds(scenario, index, running, speed)
  const doneStages = new Set(
    scenario.steps
      .filter((_, i) => i < index || (i === index && !running))
      .map((s) => s.stage),
  )

  const state = isDone
    ? {
        icon: CheckCircle2,
        text: "처리 완료",
        tone: "text-success",
        spin: false,
      }
    : waitingHuman
      ? {
          icon: UserCheck,
          text: "AI 분석 완료, 담당자 판정 대기",
          tone: "text-[var(--demo-series-2)]",
          spin: false,
        }
      : step?.actor === "AGENT"
        ? {
            icon: Bot,
            // 단계가 끝나고 다음으로 넘어가기 전(핵심 장면에서 머무는 동안)에는 결과를 보여 준다
            text: running
              ? `AI ${DOING[step.stage]}`
              : `AI ${step.title}: ${step.result}`,
            tone: "text-[var(--demo-series-1)]",
            spin: true,
          }
        : step?.actor === "SERVER"
          ? {
              icon: ShieldCheck,
              text: running
                ? `서버 규칙 ${DOING[step.stage]}`
                : `서버 규칙 ${step.title}: ${step.result}`,
              tone: "text-[var(--demo-series-3)]",
              spin: true,
            }
          : {
              icon: UserCheck,
              text: DOING[step?.stage ?? "INTAKE"],
              tone: "text-[var(--demo-series-2)]",
              spin: running,
            }

  return (
    <div className="flex h-14 shrink-0 items-center gap-6 border border-border bg-surface-elevated px-5">
      <div
        className={cn(
          "flex min-w-[360px] items-center gap-2.5 text-h2 font-bold",
          state.tone,
        )}
      >
        {state.spin && running ? (
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        ) : (
          <state.icon className="h-6 w-6" aria-hidden />
        )}
        <span className="truncate">{state.text}</span>
      </div>

      <div className="flex items-center gap-2 text-base text-ink-muted">
        AI 작업 시간
        <span className="w-16 font-bold text-ink tabular-nums">
          {seconds}초
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-base text-ink-muted">입력</span>
        {inputsOf(scenario).map((inp) => {
          const using = running && step && inp.stages.includes(step.stage)
          const used = inp.stages.some((st) => doneStages.has(st))
          return (
            <span
              key={inp.label}
              className={cn(
                "text-sm flex h-8 items-center gap-1.5 border px-2.5 font-bold transition-colors duration-300",
                using
                  ? "border-[var(--demo-series-1)] bg-primary-tint text-[var(--demo-series-1)]"
                  : used
                    ? "border-[var(--demo-series-1)] text-ink"
                    : "border-border text-ink-faint",
              )}
            >
              {using ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : used ? (
                <CheckCircle2
                  className="h-3.5 w-3.5 text-[var(--demo-series-1)]"
                  aria-hidden
                />
              ) : (
                <Circle className="h-3.5 w-3.5" aria-hidden />
              )}
              {inp.label}
            </span>
          )
        })}
      </div>

      {waitingHuman && (
        <Button
          variant="primary"
          size="md"
          className="ml-auto"
          onClick={onHuman}
        >
          {scenario.steps[index + 1]?.title}{" "}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      )}
    </div>
  )
}
