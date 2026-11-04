import { useCallback, useEffect, useState } from "react"
import type { Scenario } from "@/pages/demo-objection/model"

/**
 * 심사 대기열 시연. 사건이 들어오면 AI 가 스스로 분석을 시작한다(PLAN D15 워커가 대기열에서 가져가는 구조).
 * 시연 시작 시각은 sessionStorage 에 두어, 분석 화면에 다녀와도 목록의 진행 상태가 이어지게 한다.
 */

const KEY = "demo-objection-queue-t0"

/** 시연 시나리오가 목록에 들어오는 시각(시연 시작 기준 ms) */
export const ARRIVE_MS = [1000, 4000, 7000]

/** 재생기의 단계 사이 간격과 같게 맞춘다(use-player 자동 모드) */
const GAP_MS = 500

/** 사람 판정 직전 단계. AI 와 서버 규칙이 스스로 하는 일은 여기까지다 */
export const aiEndIndex = (s: Scenario) => {
  const human = s.steps.findIndex((st, i) => i > 0 && st.actor === "HUMAN")
  return (human === -1 ? s.steps.length : human) - 1
}

/** 단계별 시작 시각. 0번(접수)은 도착과 함께 끝난 것으로 보고 1번부터 센다 */
const timeline = (s: Scenario) => {
  const end = aiEndIndex(s)
  const starts: number[] = []
  let t = 0
  for (let i = 1; i <= end; i++) {
    starts[i] = t
    t += s.steps[i].durationMs + GAP_MS + (s.steps[i].holdMs ?? 0)
  }
  return { starts, total: t, end }
}

export type QueueState =
  | { phase: "NOT_ARRIVED" }
  | { phase: "ANALYZING"; index: number; pct: number }
  | { phase: "WAITING_HUMAN"; index: number }

export const queueState = (
  s: Scenario,
  order: number,
  elapsed: number,
): QueueState => {
  const since = elapsed - ARRIVE_MS[order]
  if (since < 0) return { phase: "NOT_ARRIVED" }
  const { starts, total, end } = timeline(s)
  if (since >= total) return { phase: "WAITING_HUMAN", index: end }
  let index = 1
  for (let i = 1; i <= end; i++) if (starts[i] <= since) index = i
  return { phase: "ANALYZING", index, pct: Math.floor((since / total) * 100) }
}

/** 고객 앱에서 제출하면 명의인 A(첫 사건)가 그 순간 도착하도록 시연 시각을 맞춘다 */
export const beginFromSubmit = () =>
  sessionStorage.setItem(KEY, String(Date.now() - ARRIVE_MS[0]))

/** 시연을 처음부터: 다음 목록 방문 때 시각을 새로 잡는다 */
export const clearQueue = () => sessionStorage.removeItem(KEY)

/** 시연 시작 이후 경과 시간. 250ms 마다 갱신한다 */
export const useQueueClock = () => {
  const read = () => {
    const saved = Number(sessionStorage.getItem(KEY))
    if (saved) return saved
    const now = Date.now()
    sessionStorage.setItem(KEY, String(now))
    return now
  }
  const [t0, setT0] = useState(read)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])
  const restart = useCallback(() => {
    const t = Date.now()
    sessionStorage.setItem(KEY, String(t))
    setT0(t)
    setNow(t)
  }, [])
  return { elapsed: now - t0, restart }
}
