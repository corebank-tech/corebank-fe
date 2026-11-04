import { useCallback, useEffect, useMemo, useState } from "react"
import type {
  DecisionPhase,
  Scenario,
  StageId,
} from "@/pages/demo-objection/model"

export type PlayerMode = "AUTO" | "STEP"

/**
 * 시나리오 재생기.
 *
 * `index` 는 지금 진행 중인 단계다(-1 은 시작 전). 단계는 `durationMs` 동안 「진행 중」이었다가
 * 끝나면 「완료」가 된다. 자동 모드는 완료되면 다음 단계로 넘어가고, 한 단계씩 모드는
 * 발표자가 → 키를 누를 때까지 기다린다. 실제 구현의 재생 모드(D22)도 같은 방식이다.
 */
type PlayerOptions = {
  /** 처음 보여 줄 단계(완료 상태로 시작). 결과 화면으로 돌아올 때 마지막 단계를 넣는다. */
  initialIndex?: number
  /** true 면 처음 단계를 진행 중으로 시작한다(목록에서 분석 중인 사건을 열 때) */
  initialRunning?: boolean
  /** true 면 열자마자 자동 재생한다. AI 는 사람이 넘기지 않아도 스스로 진행한다 */
  autoStart?: boolean
  /** true 면 자동 재생이 담당자 단계 앞에서 멈춘다. 판정은 사람만 한다 */
  stopBeforeHuman?: boolean
  /** false 면 키보드 조작을 받지 않는다(다른 화면 요소가 키를 쓰는 동안) */
  keysEnabled?: boolean
}

export const usePlayer = (
  scenario: Scenario,
  {
    initialIndex = -1,
    initialRunning = false,
    autoStart = false,
    stopBeforeHuman = false,
    keysEnabled = true,
  }: PlayerOptions = {},
) => {
  const [index, setIndex] = useState(initialIndex)
  const [running, setRunning] = useState(initialRunning)
  const [mode, setMode] = useState<PlayerMode>(autoStart ? "AUTO" : "STEP")
  const [speed, setSpeed] = useState(1)
  const [playing, setPlaying] = useState(autoStart)

  const last = scenario.steps.length - 1

  const reset = useCallback(() => {
    setIndex(-1)
    setRunning(false)
    setPlaying(false)
  }, [])

  // 시나리오가 바뀌면 처음부터. 렌더 중 상태 조정 패턴(이전 값 비교)으로 처리한다.
  const [prevId, setPrevId] = useState(scenario.id)
  if (prevId !== scenario.id) {
    setPrevId(scenario.id)
    setIndex(-1)
    setRunning(false)
    setPlaying(false)
  }

  const next = useCallback(() => {
    if (index >= last) return
    setIndex(index + 1)
    setRunning(true)
  }, [index, last])

  const prev = useCallback(() => {
    setRunning(false)
    setPlaying(false)
    setIndex((i) => Math.max(-1, i - 1))
  }, [])

  const start = useCallback(() => {
    setPlaying(true)
    if (index === -1 || index >= last) {
      setIndex(0)
      setRunning(true)
    }
  }, [index, last])

  // 진행 중인 단계가 끝나는 시점
  useEffect(() => {
    if (!running || index < 0) return
    const step = scenario.steps[index]
    const timer = window.setTimeout(() => {
      setRunning(false)
    }, step.durationMs / speed)
    return () => window.clearTimeout(timer)
  }, [running, index, speed, scenario.steps])

  // 담당자 차례: AI 와 서버 규칙 단계가 끝나고 다음이 사람의 판정이면 자동 재생을 멈춘다
  const waitingHuman =
    stopBeforeHuman &&
    !running &&
    index >= 0 &&
    index < last &&
    scenario.steps[index + 1].actor === "HUMAN"

  // 자동 모드: 단계가 끝나면 잠깐 쉬고 다음으로. 핵심 장면은 holdMs 만큼 더 머문다
  useEffect(() => {
    if (!playing || running || mode !== "AUTO" || index >= last) return
    if (waitingHuman) return
    const hold = index >= 0 ? (scenario.steps[index].holdMs ?? 0) : 0
    const timer = window.setTimeout(next, (500 + hold) / speed)
    return () => window.clearTimeout(timer)
  }, [
    playing,
    running,
    mode,
    index,
    last,
    next,
    speed,
    waitingHuman,
    scenario.steps,
  ])

  // 발표자 키보드: → 다음, ← 이전, Space 자동 재생, R 처음부터
  useEffect(() => {
    if (!keysEnabled) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
        return
      if (e.key === "ArrowRight") {
        e.preventDefault()
        next()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        prev()
      } else if (e.key === " ") {
        e.preventDefault()
        setMode("AUTO")
        if (playing) setPlaying(false)
        else start()
      } else if (e.key === "r" || e.key === "R") {
        reset()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, prev, start, reset, playing, keysEnabled])

  const view = useMemo(
    () => deriveView(scenario, index, running),
    [scenario, index, running],
  )

  // 마지막 단계가 끝나면 자동 재생도 끝난 것으로 본다(상태를 따로 되돌리지 않고 파생한다).
  const finished = index >= last && !running

  return {
    index,
    running,
    mode,
    setMode,
    speed,
    setSpeed,
    playing: playing && !finished,
    setPlaying,
    next,
    prev,
    start,
    reset,
    isDone: finished,
    waitingHuman,
    view,
  }
}

export type DemoView = ReturnType<typeof deriveView>

/** 0번부터 현재 단계까지 드러난 것을 모은다. 진행 중인 단계의 reveal 은 끝나야 반영한다. */
export const deriveView = (
  scenario: Scenario,
  index: number,
  running: boolean,
) => {
  const documentFields = new Set<string>()
  const claims = new Set<string>()
  const facts = new Set<string>()
  const links = new Set<string>()
  let ledger = false
  let ledgerFocus = false
  let injection = false
  let draft = false
  let gate = false
  let decision = "NONE" as DecisionPhase
  let accountAfter = false
  const doneStages = new Set<StageId>()

  scenario.steps.forEach((step, i) => {
    if (i > index) return
    const complete = i < index || !running
    if (!complete) return
    doneStages.add(step.stage)
    const r = step.reveal
    if (!r) return
    r.documentFields?.forEach((id) => documentFields.add(id))
    r.claims?.forEach((id) => claims.add(id))
    r.facts?.forEach((id) => facts.add(id))
    r.links?.forEach((id) => links.add(id))
    if (r.ledger) ledger = true
    if (r.ledgerFocus) ledgerFocus = true
    if (r.injection) injection = true
    if (r.draft) draft = true
    if (r.gate) gate = true
    if (r.decision) decision = r.decision
    if (r.accountAfter) accountAfter = true
  })

  const current = index >= 0 ? scenario.steps[index] : undefined

  return {
    documentFields,
    claims,
    facts,
    links,
    ledger,
    ledgerFocus,
    injection,
    draft,
    gate,
    decision,
    accountAfter,
    doneStages,
    currentStage: current?.stage,
    current,
  }
}
