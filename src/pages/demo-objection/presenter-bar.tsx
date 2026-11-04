import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  X,
} from "lucide-react"
import { ACTOR_COLOR } from "@/pages/demo-objection/chart-colors"
import { ACTOR_LABEL, type Scenario } from "@/pages/demo-objection/model"
import { Button } from "@/shared/ui/button"

type Props = {
  scenario: Scenario
  index: number
  running: boolean
  playing: boolean
  speed: number
  onPrev: () => void
  onNext: () => void
  onTogglePlay: () => void
  onReset: () => void
  onSpeed: (n: number) => void
  onClose: () => void
  /** 단계 밖 장면(결과)에서 해설을 바꿔 끼운다 */
  override?: { narration: string }
  canNext?: boolean
}

/**
 * 발표 해설 바. 높이와 버튼 위치는 고정이고, 해설은 한 줄만 쓴다(넘치면 말줄임).
 * 조작: → ← Space R, P 로 끄고 켠다.
 */
export const PresenterBar = ({
  scenario,
  index,
  playing,
  speed,
  onPrev,
  onNext,
  onTogglePlay,
  onReset,
  onSpeed,
  onClose,
  override,
  canNext,
}: Props) => {
  const step = index >= 0 ? scenario.steps[index] : undefined
  const actor = override ? undefined : step?.actor
  const color = actor ? ACTOR_COLOR[actor] : "var(--color-navy)"
  const label = override ? "결과" : actor ? ACTOR_LABEL[actor] : "시작"
  const text = override?.narration ?? step?.narration ?? scenario.oneLine

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 h-[76px] border-t-4 bg-surface-elevated shadow-pop"
      style={{ borderColor: color }}
    >
      <div className="mx-auto flex h-full max-w-[1880px] items-center gap-5 px-6">
        <span
          className="text-sm flex h-8 w-24 shrink-0 items-center justify-center font-bold text-white"
          style={{ background: color }}
        >
          {label}
        </span>
        <span className="w-16 shrink-0 text-base font-bold text-ink-muted tabular-nums">
          {override ? "" : `${Math.max(index + 1, 0)}/${scenario.steps.length}`}
        </span>
        <p className="min-w-0 flex-1 truncate text-h2 font-bold text-ink">
          {text}
        </p>
        <div className="flex w-[430px] shrink-0 items-center justify-end gap-1.5">
          <Button size="sm" variant="secondary" onClick={onReset} title="R">
            <RotateCcw className="h-4 w-4" aria-hidden /> 처음
          </Button>
          <Button size="sm" variant="secondary" onClick={onPrev} title="←">
            <ChevronLeft className="h-4 w-4" aria-hidden /> 이전
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={onNext}
            title="→"
            disabled={!(canNext ?? index < scenario.steps.length - 1)}
          >
            다음 <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onTogglePlay}
            title="Space"
            className="w-[72px]"
          >
            {playing ? (
              <Pause className="h-4 w-4" aria-hidden />
            ) : (
              <Play className="h-4 w-4" aria-hidden />
            )}
            {playing ? "멈춤" : "자동"}
          </Button>
          <select
            aria-label="재생 속도"
            className="h-8 border border-border-strong bg-surface-elevated px-2 text-xs text-ink"
            value={speed}
            onChange={(e) => onSpeed(Number(e.target.value))}
          >
            <option value={0.5}>0.5배</option>
            <option value={1}>1배</option>
            <option value={2}>2배</option>
          </select>
          <button
            type="button"
            onClick={onClose}
            aria-label="해설 끄기"
            className="ml-1 text-ink-faint hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
