import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import {
  replayOffsets,
  useTimelineReplay,
} from "@/shared/ui/agent-run-timeline/use-timeline-replay"

/** 시작 시각이 0초, 2초, 2초(시각 없음), 5초인 단계 4개. 마지막 단계는 1초 걸린다. */
const STEPS = [
  {
    seq: 1,
    startedAt: "2026-11-05T10:00:00.000",
    endedAt: "2026-11-05T10:00:00.500",
  },
  {
    seq: 2,
    startedAt: "2026-11-05T10:00:02.000",
    endedAt: "2026-11-05T10:00:03.000",
  },
  { seq: 3, startedAt: null, endedAt: null },
  {
    seq: 4,
    startedAt: "2026-11-05T10:00:05.000",
    endedAt: "2026-11-05T10:00:06.000",
  },
]

const seqs = (steps: { seq: number }[]) => steps.map((step) => step.seq)

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe("replayOffsets", () => {
  it("첫 단계 시작부터의 간격을 주고, 시각이 없으면 앞 단계와 같은 때로 둔다", () => {
    expect(replayOffsets(STEPS)).toEqual([0, 2000, 2000, 5000])
  })
})

describe("useTimelineReplay", () => {
  it("1배는 시작 시각 간격대로 순서를 지켜 단계를 붙이고 끝나면 전체 화면으로 돌아간다", () => {
    const { result } = renderHook(() => useTimelineReplay(STEPS))
    expect(seqs(result.current.visibleSteps)).toEqual([1, 2, 3, 4])

    act(() => result.current.start(1))
    expect(result.current.isReplaying).toBe(true)
    expect(result.current.speed).toBe(1)
    act(() => vi.advanceTimersByTime(0))
    expect(seqs(result.current.visibleSteps)).toEqual([1])

    act(() => vi.advanceTimersByTime(1999))
    expect(seqs(result.current.visibleSteps)).toEqual([1])
    act(() => vi.advanceTimersByTime(1))
    expect(seqs(result.current.visibleSteps)).toEqual([1, 2, 3])

    act(() => vi.advanceTimersByTime(3000))
    expect(seqs(result.current.visibleSteps)).toEqual([1, 2, 3, 4])
    expect(result.current.isReplaying).toBe(true)

    // 마지막 단계 소요(1초)와 끝맺음 시간이 지나면 재생을 끝낸다.
    act(() => vi.advanceTimersByTime(2500))
    expect(result.current.isReplaying).toBe(false)
    expect(seqs(result.current.visibleSteps)).toEqual([1, 2, 3, 4])
  })

  it("2배는 간격을 반으로 줄이고, 중지하면 바로 전체 화면으로 돌아간다", () => {
    const { result } = renderHook(() => useTimelineReplay(STEPS))

    act(() => result.current.start(2))
    act(() => vi.advanceTimersByTime(999))
    expect(seqs(result.current.visibleSteps)).toEqual([1])
    act(() => vi.advanceTimersByTime(1))
    expect(seqs(result.current.visibleSteps)).toEqual([1, 2, 3])
    act(() => vi.advanceTimersByTime(1500))
    expect(seqs(result.current.visibleSteps)).toEqual([1, 2, 3, 4])

    act(() => result.current.stop())
    expect(result.current.isReplaying).toBe(false)
    act(() => vi.advanceTimersByTime(10_000))
    expect(result.current.isReplaying).toBe(false)
  })
})
