import type { OcrPage } from "@/entities/payment-stop"
import { cn } from "@/shared/lib/utils"

type Props = {
  /** 서류 그림 주소(blob URL) */
  src: string
  alt: string
  page: OcrPage
  /** 강조할 영역 번호 */
  selectedIndex: number | null
  /** 주장과 연결된 영역 번호. 연결된 영역은 색을 달리한다 */
  linkedIndexes: Set<number>
  onSelect: (index: number) => void
}

/**
 * 판독 신뢰도가 이 값보다 낮으면 점선으로 그려 다시 볼 곳임을 보인다. 서버 D40과 워커가
 * 단계 카드의 "낮은 신뢰도 N개"를 세는 기준(0.85 미만)과 같아야 두 숫자가 맞는다.
 */
const LOW_CONFIDENCE = 0.85

/**
 * 판독 영역 오버레이(계획 PA-12). 그림 위에 판독 결과의 글자 영역 상자를 겹친다.
 *
 * 상자 좌표는 판독한 쪽 크기(`width`, `height`) 기준이다. SVG `viewBox` 를 그 크기로 두고
 * 그림과 같은 상자에 늘려 그려, 그림이 줄어도 상자가 글자 위에 머문다.
 */
export const OcrOverlay = ({
  src,
  alt,
  page,
  selectedIndex,
  linkedIndexes,
  onSelect,
}: Props) => (
  <div className="relative w-full border border-border bg-surface-elevated">
    <img src={src} alt={alt} className="block h-auto w-full" />
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={`0 0 ${page.width} ${page.height}`}
      preserveAspectRatio="none"
      role="group"
      aria-label={`${alt} 판독 영역`}
    >
      {page.regions.map((region) => {
        const [x, y, w, h] = region.bbox
        const isSelected = region.index === selectedIndex
        const isLinked = linkedIndexes.has(region.index)
        const isLow =
          region.confidence != null && region.confidence < LOW_CONFIDENCE
        return (
          <rect
            key={region.index}
            x={x - 4}
            y={y - 2}
            width={w + 8}
            height={h + 4}
            rx={3}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={`판독 영역 ${region.index}: ${region.text}`}
            data-region-index={region.index}
            onClick={() => onSelect(region.index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onSelect(region.index)
              }
            }}
            className={cn(
              "cursor-pointer outline-none",
              isSelected
                ? "fill-primary/20 stroke-primary"
                : isLinked
                  ? "fill-cool-violet/10 stroke-cool-violet"
                  : "fill-transparent stroke-ink-faint/60 hover:stroke-primary",
              "focus-visible:stroke-primary",
            )}
            strokeWidth={isSelected ? 4 : 2}
            strokeDasharray={isLow && !isSelected ? "6 4" : undefined}
          >
            <title>
              {region.text}
              {region.confidence != null &&
                ` (신뢰도 ${Math.round(region.confidence * 100)}%)`}
            </title>
          </rect>
        )
      })}
    </svg>
  </div>
)
