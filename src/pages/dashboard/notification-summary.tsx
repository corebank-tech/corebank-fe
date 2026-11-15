import { ChevronRight } from "lucide-react"
import type { NotificationInboxRow } from "@/entities/notification"
import { formatDateTime } from "@/shared/lib/format"
import { Panel, PanelHeader } from "@/shared/ui/panel"

type NotificationSummaryProps = {
  items: NotificationInboxRow[]
  /** 전체 미읽음 건수. 헤더 배지와 같은 값이다. 모르는 동안은 "-"로 둔다. */
  totalCount?: number
  /** 표시할 알림이 없을 때의 안내. 조회 실패 시 서버 오류 문구를 넘긴다. */
  emptyMessage?: string
  /** 표시할 최대 건수. 초과분은 잘라내고 "알림함"에서 전체를 본다. */
  maxVisible?: number
  onOpenInbox?: () => void
}

/** 미읽음 알림 요약 리스트. 헤더에서 알림함으로 이동. */
export const NotificationSummary = ({
  items,
  totalCount,
  maxVisible = 3,
  emptyMessage = "미읽음 알림이 없습니다.",
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
            <span className="text-primary">{totalCount ?? "-"}</span>건
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
      {visibleItems.length === 0 && (
        <p className="px-4 py-3 text-base text-ink-muted">{emptyMessage}</p>
      )}
      <ul>
        {visibleItems.map((item, i) => (
          <li
            key={item.notificationId}
            className={
              "flex items-center gap-3 px-4 py-3" +
              (i > 0 ? " border-t border-border" : "")
            }
          >
            <span className="inline-flex w-12 shrink-0 items-center justify-center border border-border-strong bg-surface-elevated px-1 py-0.5 text-xs font-bold text-ink-muted">
              {item.typeName}
            </span>
            <span className="min-w-0 flex-1 truncate text-base text-ink">
              {item.title}
            </span>
            <time className="shrink-0 text-2xs text-ink-faint">
              {formatDateTime(item.occurredAt)}
            </time>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
