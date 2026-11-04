import { useEffect, useState, type ReactNode } from "react"
import { ChevronLeft } from "lucide-react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router"
import { AgentDrawer } from "@/pages/demo-objection/agent-drawer"
import {
  ClaimCheckTable,
  Conclusion,
  WorkSplit,
} from "@/pages/demo-objection/detail-sections"
import {
  TabBar,
  TabContent,
  type TabId,
} from "@/pages/demo-objection/detail-tabs"
import { DemoShell } from "@/pages/demo-objection/demo-shell"
import type { Scenario, Step } from "@/pages/demo-objection/model"
import { PresenterBar } from "@/pages/demo-objection/presenter-bar"
import { SCENARIOS } from "@/pages/demo-objection/scenarios"
import { usePlayer } from "@/pages/demo-objection/use-player"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"
import { FormSection } from "@/shared/ui/form-section"

type SpotId = "conclusion" | "claims" | "work" | "tabs" | "drawer"

/** 이 단계가 화면의 어디를 바꾸는가 — 발표 해설을 켜면 그 영역에 테두리가 켜진다 */
const spotFor = (step?: Step): Set<SpotId> => {
  const ids = new Set<SpotId>()
  if (!step) return ids
  const r = step.reveal
  if (r?.gate || r?.decision || r?.accountAfter || r?.draft)
    ids.add("conclusion")
  if (r?.claims || r?.links || r?.facts) ids.add("claims")
  if (r?.draft) ids.add("work")
  if (
    r?.documentFields ||
    r?.injection ||
    r?.ledger ||
    r?.ledgerFocus ||
    r?.gate
  )
    ids.add("tabs")
  if (step.actor === "AGENT") ids.add("drawer")
  return ids
}

/** 이 단계가 보여 줘야 할 탭 */
const tabHint = (step: Step): TabId | undefined => {
  const r = step.reveal
  if (r?.documentFields || r?.injection) return "document"
  if (r?.ledger || r?.ledgerFocus || step.tool?.name === "get_ledger")
    return "ledger"
  if (r?.gate) return "rules"
  if (r?.accountAfter) return "history"
  return undefined
}

export const ObjectionDetailPage = () => {
  const { scenarioId } = useParams()
  const scenario: Scenario =
    SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]
  const navigate = useNavigate()
  // AI 분석 진행 화면에서 돌아오면(?done=1) 결과가 채워진 상태로 연다
  const [params] = useSearchParams()
  const done = params.get("done") === "1"
  const player = usePlayer(scenario, {
    initialIndex: done ? scenario.steps.length - 1 : -1,
  })
  const { view, index, running } = player

  const [presenter, setPresenter] = useState(false)
  const [drawerClosed, setDrawerClosed] = useState(false)
  const [hoveredField, setHoveredField] = useState<string>()
  const [manualTab, setManualTab] = useState<{ tab: TabId; at: number }>()

  // 탭: 발표 중에는 단계가 가리키는 탭을 따라가고, 사람이 고르면 그 단계 동안은 고른 탭을 유지한다.
  const hinted = scenario.steps
    .slice(0, index + 1)
    .map(tabHint)
    .filter((t): t is TabId => t !== undefined)
    .at(-1)
  const tab: TabId =
    manualTab && (manualTab.at === index || !presenter)
      ? manualTab.tab
      : (hinted ?? "document")

  const spot = presenter ? spotFor(view.current) : new Set<SpotId>()
  const analyzing = index >= 0 && !view.gate
  const showDrawer = index >= 1 && !drawerClosed

  // P: 발표 해설 켜고 끄기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
        return
      if (e.key === "p" || e.key === "P") setPresenter((v) => !v)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // 단계가 바뀌면 바뀐 영역이 화면에 들어오게 옮긴다(발표 해설이 켜져 있을 때만)
  const firstSpot = [...spot].find((s) => s !== "drawer")
  useEffect(() => {
    if (!presenter || !firstSpot) return
    document
      .querySelector(`[data-spot="${firstSpot}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [presenter, firstSpot, index])

  const togglePlay = () => {
    player.setMode("AUTO")
    if (player.playing) player.setPlaying(false)
    else player.start()
  }

  const badges: Partial<Record<TabId, string>> = {}
  if (view.documentFields.size > 0)
    badges.document = `OCR ${view.documentFields.size}`
  if (view.ledger) badges.ledger = `${scenario.ledger.length}건`
  if (view.gate) badges.rules = "점검 완료"

  return (
    <DemoShell title="지급정지 이의제기 심사">
      <div className={cn("flex gap-4", presenter && "pb-44")}>
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* 머리 */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                to="/demo/objection"
                className="flex items-center gap-1 text-base text-ink-muted hover:text-ink"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden /> 심사 대기 목록
              </Link>
              <span className="text-ink-faint">/</span>
              <span className="text-base font-bold text-ink">
                {scenario.caseInfo.caseNo}
              </span>
              <span className="text-base text-ink-muted">
                {scenario.caseInfo.holder}&nbsp;&nbsp;
                {scenario.caseInfo.account}&nbsp;&nbsp;다툼 입금{" "}
                {scenario.caseInfo.disputedAmount.toLocaleString("ko-KR")}원
              </span>
            </div>
            <div className="flex gap-2">
              {index >= 1 && drawerClosed && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setDrawerClosed(false)}
                >
                  AI 분석 진행 보기
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setPresenter((v) => !v)}
              >
                발표 해설 {presenter ? "끄기" : "켜기"} (P)
              </Button>
            </div>
          </div>

          <Spot id="conclusion" spot={spot}>
            <Conclusion
              scenario={scenario}
              view={view}
              analyzing={analyzing}
              onAnalyze={() => navigate(`/demo/objection/${scenario.id}/run`)}
            />
          </Spot>

          <Spot id="claims" spot={spot}>
            <FormSection title="고객 주장 확인" className="mb-0">
              <ClaimCheckTable
                scenario={scenario}
                view={view}
                running={running}
                started={index >= 0}
              />
            </FormSection>
          </Spot>

          <Spot id="work" spot={spot}>
            <WorkSplit
              scenario={scenario}
              index={index}
              running={running}
              view={view}
            />
          </Spot>

          <Spot id="tabs" spot={spot}>
            <section>
              <TabBar
                active={tab}
                onChange={(t) => setManualTab({ tab: t, at: index })}
                badges={badges}
              />
              <div className="border border-t-0 border-border bg-surface-elevated p-5">
                <TabContent
                  tab={tab}
                  scenario={scenario}
                  view={view}
                  index={index}
                  running={running}
                  hoveredField={hoveredField}
                  onHoverField={setHoveredField}
                />
              </div>
            </section>
          </Spot>
        </div>

        {showDrawer && (
          <div
            data-spot="drawer"
            className={cn(
              "sticky top-6 h-[calc(100vh-7rem)] self-start transition-[outline] duration-300",
              spot.has("drawer") &&
                "outline-2 outline-offset-4 outline-primary",
              presenter && "h-[calc(100vh-18rem)]",
            )}
          >
            <AgentDrawer
              scenario={scenario}
              index={index}
              running={running}
              onClose={() => setDrawerClosed(true)}
            />
          </div>
        )}
      </div>

      {presenter && (
        <PresenterBar
          scenario={scenario}
          index={index}
          running={running}
          playing={player.playing}
          speed={player.speed}
          onPrev={player.prev}
          onNext={player.next}
          onTogglePlay={togglePlay}
          onReset={player.reset}
          onSpeed={player.setSpeed}
          onClose={() => setPresenter(false)}
        />
      )}
    </DemoShell>
  )
}

const Spot = ({
  id,
  spot,
  children,
}: {
  id: SpotId
  spot: Set<SpotId>
  children: ReactNode
}) => (
  <div
    data-spot={id}
    className={cn(
      "scroll-mt-6 scroll-mb-48 transition-[outline] duration-300",
      spot.has(id) && "outline-2 outline-offset-4 outline-primary",
    )}
  >
    {children}
  </div>
)
