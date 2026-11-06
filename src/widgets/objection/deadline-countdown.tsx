import { AlarmClock, CalendarClock } from "lucide-react"
import { businessDaysUntil } from "@/entities/payment-stop"
import { getToday } from "@/shared/config/clock"
import { formatDate } from "@/shared/lib/format"
import { cn } from "@/shared/lib/utils"

type Props = {
  /** 무슨 기한인가(예: 심사 기한, 보완 기한) */
  label: string
  /** 기한 날짜(`yyyy-MM-dd`). 아직 정해지지 않았으면 `null` */
  deadline: string | null
  /** 경보 여부. 서버 `deadlineAlert` 를 그대로 받는다 */
  alert: boolean
  /** 기한이 정해지지 않았을 때 문구 */
  pendingText?: string
  /** 목록 칸처럼 좁은 자리에 한 줄로 그린다 */
  compact?: boolean
  /** 오늘 날짜. 테스트가 고정한다 */
  today?: string
}

/** 남은 영업일 문구. 공휴일은 서버만 알아 화면은 평일을 센다. */
const remainingText = (today: string, deadline: string) => {
  const days = businessDaysUntil(today, deadline)
  if (days > 0) return `${days}영업일 남음`
  if (days === 0) return "오늘 마감"
  return `${-days}영업일 지남`
}

/**
 * 기한 카운트다운(계획 PA-11, D12). 경보 색은 서버 `deadlineAlert` 로만 정한다 — 서버는
 * 공휴일을 넣어 계산하고 화면은 주말만 빼므로, 화면 셈으로 색을 정하면 서버와 갈린다.
 */
export const DeadlineCountdown = ({
  label,
  deadline,
  alert,
  pendingText = "미정",
  compact,
  today = getToday(),
}: Props) => {
  const Icon = alert ? AlarmClock : CalendarClock
  if (deadline == null) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-ink-faint",
          compact ? "text-xs" : "text-base",
        )}
      >
        {!compact && <span className="font-bold text-ink">{label}</span>}
        {pendingText}
      </span>
    )
  }
  const remaining = remainingText(today, deadline)
  return (
    <span
      role="status"
      aria-label={`${label} ${formatDate(deadline)}, ${remaining}${alert ? ", 기한 임박" : ""}`}
      data-alert={alert || undefined}
      className={cn(
        "inline-flex items-center gap-1.5 border tabular-nums",
        compact ? "px-1.5 py-0.5 text-xs" : "px-3 py-1.5 text-base",
        alert
          ? "border-danger bg-danger-tint text-danger"
          : "border-border bg-surface-elevated text-ink",
      )}
    >
      <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
      {!compact && <span className="font-bold">{label}</span>}
      <span>{formatDate(deadline)}</span>
      <span className={cn("font-bold", !alert && "text-primary")}>
        {remaining}
      </span>
    </span>
  )
}
