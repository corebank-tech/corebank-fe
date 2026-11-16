import * as React from "react"
import type { FdsHeldTransferView } from "@/entities/fds/model/fds-held-transfer-view"

/** fixture 단계를 재생하는 UI 전용 player. 실제 조사 상태를 저장하지 않는다. */
export const useFdsFixturePlayer = (fixture: FdsHeldTransferView) => {
  const [index, setIndex] = React.useState(0)
  const [playing, setPlaying] = React.useState(true)
  const [speed, setSpeed] = React.useState(1)
  const step = fixture.steps[index]
  const waitingHuman = step.actor === "HUMAN"

  React.useEffect(() => {
    if (!playing || waitingHuman || index >= fixture.steps.length - 1) return
    const timer = window.setTimeout(
      () => setIndex((current) => current + 1),
      Math.round(step.durationMs / speed) + 500,
    )
    return () => window.clearTimeout(timer)
  }, [
    fixture.steps.length,
    index,
    playing,
    speed,
    step.durationMs,
    waitingHuman,
  ])

  return {
    index,
    step,
    playing,
    speed,
    waitingHuman,
    prev: () => {
      setPlaying(false)
      setIndex((current) => Math.max(0, current - 1))
    },
    next: () => {
      setPlaying(false)
      setIndex((current) => Math.min(fixture.steps.length - 1, current + 1))
    },
    reset: () => {
      setPlaying(false)
      setIndex(0)
    },
    setPlaying,
    setSpeed,
  }
}
