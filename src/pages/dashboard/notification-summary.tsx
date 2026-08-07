import { ChevronRight } from "lucide-react"
import type { NotificationItem } from "@/entities/dashboard"
import { formatDateTime } from "@/shared/lib/format"
import { Panel, PanelHeader } from "@/shared/ui/panel"

type NotificationSummaryProps = {
  items: NotificationItem[]
  /** 전체 미읽음 건수. 헤더 숫자에 사용, 미지정 시 items.length로 대체. */
  totalCount?: number
  /** 표시할 최대 건수. 초과분은 잘라내고 "알림함"에서 전체를 본다. */
  maxVisible?: number
  onOpenInbox?: () => void
}

/** 미읽음 알림 요약 리스트. 헤더에서 알림함으로 이동. */
export const NotificationSummary = ({
  items,
  totalCount,
  maxVisible = 3,
  onOpenInbox,
}: NotificationSummaryProps) => {
  const visibleItems = items.slice(0, maxVisible)

  return (
    <Panel aria-label="미읽음 알림">
      <PanelHeader
        className="border-b border-border bg-surface"
        title={
          <>
            미읽음 알림{" "}
            <span className="text-primary">{totalCount ?? items.length}</span>건
          </>
        }
        action={
          <button
            type="button"
            onClick={onOpenInbox}
            className="inline-flex items-center gap-0.5 text-base font-bold text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            알림함
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        }
      />
      <ul>
        {visibleItems.map((item, i) => (
          <li
            key={item.id}
            className={
              "flex items-center gap-3 px-4 py-3" +
              (i > 0 ? " border-t border-border" : "")
            }
          >
            <span className="inline-flex w-12 shrink-0 items-center justify-center border border-border-strong bg-surface-elevated px-1 py-0.5 text-xs font-bold text-ink-muted">
              {item.category}
            </span>
            <span className="min-w-0 flex-1 truncate text-base text-ink">
              {item.title}
            </span>
            <time className="shrink-0 text-2xs text-ink-faint">
              {formatDateTime(item.datetime)}
            </time>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
