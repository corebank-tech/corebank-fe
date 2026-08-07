import { ChevronLeft, ChevronRight } from "lucide-react"
import { IconButton } from "@/shared/ui/icon-button"
import { cn } from "@/shared/lib/utils"

type PaginationProps = {
  /** 1-based current page. */
  page: number
  /** Total number of pages. */
  totalPages: number
  /** How many page numbers per block. Defaults to 10. */
  blockSize?: number
  onPageChange: (page: number) => void
}

export const Pagination = ({
  page,
  totalPages,
  blockSize = 10,
  onPageChange,
}: PaginationProps) => {
  if (totalPages <= 0) return null

  const currentBlock = Math.floor((page - 1) / blockSize)
  const blockStart = currentBlock * blockSize + 1
  const blockEnd = Math.min(blockStart + blockSize - 1, totalPages)

  const pages: number[] = []
  for (let p = blockStart; p <= blockEnd; p += 1) pages.push(p)

  const go = (target: number) => {
    const clamped = Math.min(Math.max(target, 1), totalPages)
    if (clamped !== page) onPageChange(clamped)
  }

  const navBtnClass =
    "border border-border-strong bg-surface-elevated text-ink-muted hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"

  return (
    <nav
      className="flex items-center justify-center gap-1 pt-5"
      aria-label="페이지 이동"
    >
      <IconButton
        className={navBtnClass}
        onClick={() => go(blockStart - 1)}
        disabled={blockStart <= 1}
        aria-label="이전 페이지 묶음"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </IconButton>

      {pages.map((p) => {
        const active = p === page
        return (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 font-tabular text-base whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active
                ? "border-primary bg-primary font-bold text-primary-foreground"
                : "border-border bg-surface-elevated text-ink hover:bg-surface",
            )}
          >
            {p}
          </button>
        )
      })}

      <IconButton
        className={navBtnClass}
        onClick={() => go(blockEnd + 1)}
        disabled={blockEnd >= totalPages}
        aria-label="다음 페이지 묶음"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </IconButton>
    </nav>
  )
}
