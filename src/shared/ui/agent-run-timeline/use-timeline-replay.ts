import * as React from "react"

/**
 * 실행 타임라인 재생(계획 PA-15). 저장된 단계를 처음 단계 시작 시각부터의 간격대로 하나씩
 * 다시 붙인다. 2배면 간격을 반으로 줄인다.
 *
 * 화면 부품만 다룬다. 단계를 어디서 받는지(전체 조회, 캐시)는 쓰는 쪽이 정해 넘긴다.
 */

export type ReplaySpeed = 1 | 2

export const REPLAY_SPEEDS: readonly ReplaySpeed[] = [1, 2]

type Timed = { startedAt: string | null; endedAt?: string | null }

/** 마지막 단계가 붙은 뒤 재생 화면을 잠시 더 보여 주는 시간. */
const END_HOLD_MS = 1_500

/**
 * 단계마다 첫 단계 시작부터 흐른 밀리초. 시각이 없거나 앞 단계보다 이르면 앞 단계와 같은
 * 때로 둔다. 순서는 받은 순서를 지킨다.
 */
export const replayOffsets = (steps: Timed[]): number[] => {
  const offsets: number[] = []
  let origin: number | null = null
  let previous = 0
  for (const step of steps) {
    const millis = step.startedAt ? new Date(step.startedAt).getTime() : NaN
    if (Number.isNaN(millis)) {
      offsets.push(previous)
      continue
    }
    origin ??= millis
    previous = Math.max(previous, millis - origin)
    offsets.push(previous)
  }
  return offsets
}

export const useTimelineReplay = <TStep extends Timed>(
  steps: TStep[] | undefined,
) => {
  const [replay, setReplay] = React.useState<{
    speed: ReplaySpeed
    shown: number
  } | null>(null)
  const timersRef = React.useRef<number[]>([])

  const clearTimers = React.useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
  }, [])

  React.useEffect(() => clearTimers, [clearTimers])

  const stop = React.useCallback(() => {
    clearTimers()
    setReplay(null)
  }, [clearTimers])

  const start = (speed: ReplaySpeed) => {
    const source = steps ?? []
    clearTimers()
    if (source.length === 0) return
    const offsets = replayOffsets(source)
    setReplay({ speed, shown: 0 })
    offsets.forEach((offset, index) => {
      timersRef.current.push(
        window.setTimeout(
          () => setReplay({ speed, shown: index + 1 }),
          offset / speed,
        ),
      )
    })
    // 마지막 단계가 붙고 그 단계가 걸린 만큼 지나면 재생을 끝내고 원래 화면으로 돌아간다.
    const last = source.at(-1)
    const lastDuration =
      last?.startedAt && last.endedAt
        ? Math.max(
            0,
            new Date(last.endedAt).getTime() -
              new Date(last.startedAt).getTime(),
          )
        : 0
    timersRef.current.push(
      window.setTimeout(
        () => setReplay(null),
        ((offsets.at(-1) ?? 0) + lastDuration) / speed + END_HOLD_MS,
      ),
    )
  }

  return {
    isReplaying: replay != null,
    speed: replay?.speed ?? null,
    /** 재생 중이면 지금까지 붙은 단계, 아니면 받은 단계 전부 */
    visibleSteps:
      replay != null ? (steps ?? []).slice(0, replay.shown) : (steps ?? []),
    start,
    stop,
  }
}
