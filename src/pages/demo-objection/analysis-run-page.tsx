import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ChevronLeft } from "lucide-react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import { AgentStatus } from "@/pages/demo-objection/agent-status"
import { DemoShell } from "@/pages/demo-objection/demo-shell"
import { won, type Scenario, type Step } from "@/pages/demo-objection/model"
import { PresenterBar } from "@/pages/demo-objection/presenter-bar"
import { RunRail } from "@/pages/demo-objection/run-rail"
import { SCENARIOS } from "@/pages/demo-objection/scenarios"
import {
  AccountScene,
  CaseScene,
  ClaimsScene,
  DecisionScene,
  DraftScene,
  GateScene,
  MatchScene,
  OcrScene,
  InputScene,
  QueryScene,
  StatementScene,
  SummaryScene,
  type SceneProps,
} from "@/pages/demo-objection/scenes"
import { deriveView, usePlayer } from "@/pages/demo-objection/use-player"
import { Button } from "@/shared/ui/button"

type SceneKind =
  | "case"
  | "start"
  | "statement"
  | "ocr"
  | "claims"
  | "query"
  | "match"
  | "draft"
  | "gate"
  | "decision"
  | "account"
  | "summary"

const SCENES: Record<SceneKind, (p: SceneProps) => ReactNode> = {
  case: CaseScene,
  start: InputScene,
  statement: StatementScene,
  ocr: OcrScene,
  claims: ClaimsScene,
  query: QueryScene,
  match: MatchScene,
  draft: DraftScene,
  gate: GateScene,
  decision: DecisionScene,
  account: AccountScene,
  summary: SummaryScene,
}

/** 단계 → 장면. 한 장면만 화면 가운데에 크게 띄운다. */
const sceneFor = (step?: Step): SceneKind => {
  if (!step) return "case"
  const r = step.reveal
  if (step.stage === "INTAKE") return step.actor === "AGENT" ? "start" : "case"
  if (step.stage === "OCR") return "ocr"
  if (step.tool) return "query"
  if (step.stage === "CLAIMS")
    return r?.claims && !r.injection ? "claims" : "statement"
  if (step.stage === "LEDGER") return "match"
  if (step.stage === "DRAFT") return "draft"
  if (step.stage === "GATE") return "gate"
  if (step.stage === "DECISION") return "decision"
  return "account"
}

/**
 * AI 심사 진행 화면(시연). 단계가 바뀔 때마다 가운데 장면이 통째로 바뀐다 —
 * 화면 밖에서 무언가 바뀌는 일이 없게 한다. 끝나면 결과 정리 → 실무 심사 화면으로 돌아간다.
 */
export const AnalysisRunPage = () => {
  const { scenarioId } = useParams()
  const navigate = useNavigate()
  const scenario: Scenario =
    SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]
  // 목록에서 열면 AI 가 하고 있던 단계(at)부터 이어서 본다. live=1 이면 그 단계가 진행 중이다
  const [params] = useSearchParams()
  const at = Number(params.get("at") ?? 0)
  const [summary, setSummary] = useState(false)
  const [presenter, setPresenter] = useState(true)
  const player = usePlayer(scenario, {
    initialIndex: at,
    initialRunning: params.get("live") === "1" || at === 0,
    autoStart: true,
    stopBeforeHuman: true,
    keysEnabled: !summary,
  })
  const { index, running, isDone, waitingHuman } = player

  // 진행 중 단계의 내용도 장면에는 바로 보여 준다(장면 안에서 순서대로 애니메이션)
  const live = useMemo(
    () => deriveView(scenario, index, false),
    [scenario, index],
  )
  const step = index >= 0 ? scenario.steps[index] : undefined
  const kind: SceneKind = summary ? "summary" : sceneFor(step)
  const Scene = SCENES[kind]
  const backToDetail = () => navigate(`/demo/objection/${scenario.id}?done=1`)

  // 마지막 단계 뒤 → 는 결과 정리, 결과 정리에서 ← 는 마지막 단계, P 는 해설 켜기/끄기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && isDone && !summary) setSummary(true)
      else if (e.key === "ArrowLeft" && summary) setSummary(false)
      else if ((e.key === "r" || e.key === "R") && summary) {
        setSummary(false)
        player.reset()
      } else if (e.key === "p" || e.key === "P") setPresenter((v) => !v)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isDone, summary, player])

  const togglePlay = () => {
    player.setMode("AUTO")
    if (player.playing) player.setPlaying(false)
    else player.start()
  }

  const c = scenario.caseInfo

  return (
    <DemoShell title="지급정지 이의제기 심사" defaultWide>
      <div
        className="flex flex-col gap-4"
        style={{
          height: presenter
            ? "calc(100vh - 56px - 48px - 84px)"
            : "calc(100vh - 56px - 48px)",
        }}
      >
        {/* 사건 한 줄: 항목은 칸으로 나눠 중간 점 없이 */}
        <div className="flex h-10 shrink-0 items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-base">
            <Link
              to="/demo/objection"
              className="flex items-center gap-1 text-ink-muted hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden /> 심사 대기 목록
            </Link>
            <span className="font-bold text-ink">{c.caseNo}</span>
            <span className="text-ink">{c.holder}</span>
            <span className="text-ink">다툼 입금 {won(c.disputedAmount)}</span>
            <span className="text-ink">통보 기한 {c.dueDate}</span>
          </div>
          <Button
            size="sm"
            variant={isDone ? "primary" : "secondary"}
            onClick={backToDetail}
            disabled={!isDone}
            className="w-[150px]"
          >
            심사 화면으로
          </Button>
        </div>

        <AgentStatus
          scenario={scenario}
          index={index}
          running={running}
          speed={player.speed}
          waitingHuman={waitingHuman}
          isDone={isDone}
          onHuman={player.next}
        />

        <div className="flex min-h-0 flex-1 gap-5">
          <RunRail
            scenario={scenario}
            index={index}
            running={running}
            speed={player.speed}
            summary={summary}
          />
          <section className="min-w-0 flex-1 overflow-hidden border border-border bg-surface-elevated p-7">
            <div key={`${scenario.id}-${index}-${kind}`} className="h-full">
              <Scene
                scenario={scenario}
                step={step}
                live={live}
                running={running && !summary}
                speed={player.speed}
              />
            </div>
          </section>
        </div>
      </div>

      {presenter && (
        <PresenterBar
          scenario={scenario}
          index={index}
          running={running}
          playing={player.playing}
          speed={player.speed}
          onPrev={summary ? () => setSummary(false) : player.prev}
          onNext={
            isDone
              ? () => (summary ? backToDetail() : setSummary(true))
              : player.next
          }
          canNext
          onTogglePlay={togglePlay}
          onReset={() => {
            setSummary(false)
            player.reset()
          }}
          onSpeed={player.setSpeed}
          onClose={() => setPresenter(false)}
          override={summary ? { narration: `${scenario.oneLine}.` } : undefined}
        />
      )}
    </DemoShell>
  )
}
