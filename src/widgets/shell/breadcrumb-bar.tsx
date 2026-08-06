import { ChevronRight } from "lucide-react"

type BreadcrumbBarProps = {
  trail?: string[]
}

/** REQ-CMN-004: 콘텐츠 영역 최상단에 표시되는 현재 위치 경로. */
export const BreadcrumbBar = ({
  trail = ["개인", "이체", "예약이체", "예약이체 등록"],
}: BreadcrumbBarProps) => {
  return (
    <nav aria-label="현재 위치" className="mb-4">
      <ol className="flex items-center gap-1 text-base leading-[1.5] text-ink-faint">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1
          return (
            <li key={`${crumb}-${i}`} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 text-border-strong"
                  aria-hidden="true"
                />
              )}
              <span className={last ? "text-ink-muted" : ""}>{crumb}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
