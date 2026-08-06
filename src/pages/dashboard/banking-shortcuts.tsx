import { Link } from "react-router"
import { ChevronRight } from "lucide-react"

export type ShortcutLink = {
  id: string
  label: string
  href: string
}

type BankingShortcutsProps = {
  label?: string
  /** 표시할 바로가기 목록. 기본값은 호출 측(A09MainDashboard)에서 주입한다. */
  links: ShortcutLink[]
  onSelect?: (id: string) => void
}

/** 업무 바로가기: primary-tint 띠 + 좌측 라벨 + 우측 카드형 링크. */
export const BankingShortcuts = ({
  label = "나의 뱅킹정보",
  links,
  onSelect,
}: BankingShortcutsProps) => {
  return (
    <section
      aria-label="업무 바로가기"
      className="flex items-center gap-6 border border-border bg-primary-tint px-6 py-5"
    >
      <h2 className="shrink-0 text-base font-bold text-primary">{label}</h2>
      <ul className="grid flex-1 grid-cols-4 gap-3">
        {links.map((link) => (
          <li key={link.id}>
            <Link
              to={link.href}
              onClick={(e) => {
                if (onSelect) {
                  e.preventDefault()
                  onSelect(link.id)
                }
              }}
              className="flex items-center justify-between rounded-md border border-border bg-surface-elevated px-4 py-3 text-base font-bold whitespace-nowrap text-ink transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {link.label}
              <ChevronRight
                className="h-4 w-4 text-ink-faint"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
