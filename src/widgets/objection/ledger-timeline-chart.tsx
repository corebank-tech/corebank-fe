import * as React from "react"
import type { GateRuleCheck, LedgerEntry } from "@/entities/payment-stop"
import { formatAmount, formatDateTime } from "@/shared/lib/format"
import { cn } from "@/shared/lib/utils"

type Props = {
  entries: LedgerEntry[]
  /** 해제 요건 점검 규칙. 관계 거래와 사기 패턴 점검 거래, 색을 여기서 읽는다 */
  rules: GateRuleCheck[]
  focusedTransaction: string | null
  onSelectTransaction: (transactionNumber: string) => void
}

/**
 * 거래의 역할. 색은 해제 요건 점검표(`gate-checklist.tsx`)와 같은 뜻으로 쓴다 — 다툼 거래는
 * "판단 근거 아님"의 주의색, 관계 인정은 성립하면 성공색, 사기 패턴은 성립하면 위험색이다.
 * 규칙이 성립하지 않았으면 같은 거래도 중립색이다.
 */
type MarkRole = "DISPUTED" | "RELATIONSHIP" | "FRAUD" | "OTHER"

const ROLE_LABEL: Record<MarkRole, string> = {
  DISPUTED: "다툼 거래",
  RELATIONSHIP: "관계 거래",
  FRAUD: "사기 패턴 점검 거래",
  OTHER: "그 밖의 거래",
}

const HOUR_MS = 60 * 60 * 1000
const WINDOW_MS = 24 * HOUR_MS
/** 즉시 출금으로 보는 간격(사기 패턴 규칙의 60분). */
const OUTFLOW_MS = 60 * 60 * 1000

const WIDTH = 960
const PAD_X = 28
const OVERVIEW_HEIGHT = 128
const ZOOM_HEIGHT = 210

const toMillis = (value: string) => new Date(value).getTime()

const pad = (n: number) => String(n).padStart(2, "0")
const dayLabel = (millis: number) => {
  const date = new Date(millis)
  return `${date.getMonth() + 1}/${date.getDate()}`
}
const minuteLabel = (millis: number) => {
  const date = new Date(millis)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}
const hourLabel = (millis: number) => {
  const date = new Date(millis)
  return `${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}시`
}

const scale = (from: number, to: number) => {
  const span = Math.max(1, to - from)
  return (millis: number) =>
    PAD_X + ((millis - from) / span) * (WIDTH - PAD_X * 2)
}

const ticks = (from: number, to: number, count: number) =>
  Array.from(
    { length: count + 1 },
    (_, index) => from + ((to - from) * index) / count,
  )

type Mark = LedgerEntry & { millis: number; role: MarkRole; matched: boolean }

const fillClass = (mark: Mark) => {
  if (mark.role === "DISPUTED") return "fill-warning"
  if (mark.role === "RELATIONSHIP" && mark.matched) return "fill-success"
  if (mark.role === "FRAUD" && mark.matched) return "fill-danger"
  return mark.direction === "WITHDRAWAL" ? "fill-ink-muted" : "fill-ink-faint"
}

const describe = (mark: Mark) =>
  `${mark.direction === "WITHDRAWAL" ? "출금" : "입금"} ${formatAmount(mark.amount)}, ${formatDateTime(mark.occurredAt)}, ${ROLE_LABEL[mark.role]}${mark.interbank ? ", 타행" : ""}`

const MarkShape = ({
  mark,
  x,
  y,
  r,
  id,
  isFocused,
  onSelect,
}: {
  mark: Mark
  x: number
  y: number
  r: number
  id?: string
  isFocused: boolean
  onSelect: (transactionNumber: string) => void
}) => (
  <g
    id={id}
    role="button"
    tabIndex={0}
    aria-label={describe(mark)}
    aria-pressed={isFocused}
    data-role={mark.role}
    data-transaction={mark.transactionNumber}
    className="cursor-pointer outline-none"
    onClick={() => onSelect(mark.transactionNumber)}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        onSelect(mark.transactionNumber)
      }
    }}
  >
    <title>{`${mark.transactionNumber}\n${describe(mark)}`}</title>
    {isFocused && (
      <circle
        cx={x}
        cy={y}
        r={r + 5}
        className="fill-none stroke-primary"
        strokeWidth={3}
      />
    )}
    {mark.direction === "WITHDRAWAL" ? (
      <rect
        x={x - r}
        y={y - r}
        width={r * 2}
        height={r * 2}
        className={cn(fillClass(mark), "stroke-surface-elevated")}
        strokeWidth={1.5}
      />
    ) : (
      <circle
        cx={x}
        cy={y}
        r={r}
        className={cn(fillClass(mark), "stroke-surface-elevated")}
        strokeWidth={1.5}
      />
    )}
  </g>
)

const LegendItem = ({
  className,
  label,
  square,
}: {
  className: string
  label: string
  square?: boolean
}) => (
  <li className="flex items-center gap-1.5">
    <span
      className={cn(
        "inline-block h-2.5 w-2.5",
        square ? "" : "rounded-full",
        className,
      )}
      aria-hidden
    />
    {label}
  </li>
)

/**
 * 원장 타임라인 차트(계획 PA-11). 위는 해제 요건 점검 창 전체, 아래는 다툼 거래 전후 24시간을
 * 넓혀 본다. 입금은 축 위 원, 출금은 축 아래 네모이고 크기는 금액이다. 다툼 거래나 그 뒤 입금에서
 * 60분 안에 나간 출금은 화살표로 잇는다.
 */
export const LedgerTimelineChart = ({
  entries,
  rules,
  focusedTransaction,
  onSelectTransaction,
}: Props) => {
  const markerId = React.useId()
  const relationRule = rules.find((rule) => rule.rule === "RELATIONSHIP")
  const fraudRule = rules.find((rule) => rule.rule === "FRAUD_PATTERN")
  const relationNumbers = new Set(relationRule?.transactionNumbers ?? [])
  const fraudNumbers = new Set(fraudRule?.transactionNumbers ?? [])

  const marks: Mark[] = entries.map((entry) => {
    const role: MarkRole = entry.disputed
      ? "DISPUTED"
      : relationNumbers.has(entry.transactionNumber)
        ? "RELATIONSHIP"
        : fraudNumbers.has(entry.transactionNumber)
          ? "FRAUD"
          : "OTHER"
    const matched =
      role === "RELATIONSHIP"
        ? (relationRule?.matched ?? false)
        : role === "FRAUD"
          ? (fraudRule?.matched ?? false)
          : false
    return { ...entry, millis: toMillis(entry.occurredAt), role, matched }
  })

  if (marks.length === 0) {
    return (
      <p className="py-6 text-center text-base text-ink-faint">
        표시할 원장 거래가 없습니다.
      </p>
    )
  }

  const disputed = marks.filter((mark) => mark.disputed)
  const allMillis = marks.map((mark) => mark.millis)
  const from = Math.min(...allMillis)
  const to = Math.max(...allMillis)
  const overviewSpan = Math.max(to - from, HOUR_MS)
  const xOverview = scale(from - overviewSpan * 0.02, to + overviewSpan * 0.02)
  const maxAmount = Math.max(...marks.map((mark) => mark.amount), 1)
  const radius = (amount: number, base: number) =>
    base + base * 1.6 * Math.sqrt(amount / maxAmount)

  const hasWindow = disputed.length > 0
  const windowFrom = hasWindow
    ? Math.min(...disputed.map((mark) => mark.millis)) - WINDOW_MS
    : from
  const windowTo = hasWindow
    ? Math.max(...disputed.map((mark) => mark.millis)) + WINDOW_MS
    : to
  const inWindow = (mark: Mark) =>
    mark.millis >= windowFrom && mark.millis <= windowTo
  const zoomMarks = marks.filter(inWindow)
  // 창은 48시간이지만 거래는 보통 몇십 분에 몰린다. 창 전체를 그리면 점이 한데 겹치므로 창 안
  // 거래가 있는 구간만 넓혀 그리고, 창 자체는 위 전체 그림의 띠로 보인다.
  const zoomTimes = zoomMarks.map((mark) => mark.millis)
  const zoomSpan = Math.max(...zoomTimes) - Math.min(...zoomTimes)
  const zoomPad = Math.max(15 * 60 * 1000, zoomSpan * 0.08)
  const zoomFrom = Math.max(windowFrom, Math.min(...zoomTimes) - zoomPad)
  const zoomTo = Math.min(windowTo, Math.max(...zoomTimes) + zoomPad)
  const xZoom = scale(zoomFrom, zoomTo)
  const zoomTickLabel =
    zoomTo - zoomFrom > 12 * HOUR_MS ? hourLabel : minuteLabel
  const fraudMatched = fraudRule?.matched ?? false

  // 다툼 거래와 그 뒤 입금에서 60분 안에 나간 출금.
  const outflows = zoomMarks
    .filter(
      (mark) =>
        mark.direction === "DEPOSIT" && (mark.disputed || mark.afterDispute),
    )
    .flatMap((deposit) =>
      zoomMarks
        .filter(
          (mark) =>
            mark.direction === "WITHDRAWAL" &&
            mark.millis > deposit.millis &&
            mark.millis - deposit.millis <= OUTFLOW_MS,
        )
        .map((withdrawal) => ({ deposit, withdrawal })),
    )

  const bandX = xOverview(windowFrom)
  const bandWidth = Math.max(6, xOverview(windowTo) - bandX)
  const OVERVIEW_AXIS = 64
  const ZOOM_AXIS = 108

  return (
    <div className="flex flex-col gap-2">
      <figure className="flex flex-col gap-1">
        <figcaption className="text-xs font-bold text-ink">
          점검 창 전체
          <span className="ml-2 font-normal text-ink-muted">
            {dayLabel(from)} ~ {dayLabel(to)}, 거래 {marks.length}건
          </span>
        </figcaption>
        <svg
          viewBox={`0 0 ${WIDTH} ${OVERVIEW_HEIGHT}`}
          className="h-auto w-full"
          role="group"
          aria-label="원장 타임라인 전체"
        >
          {hasWindow && (
            <rect
              x={bandX}
              y={10}
              width={bandWidth}
              height={OVERVIEW_HEIGHT - 34}
              className={fraudMatched ? "fill-danger-tint" : "fill-surface"}
              data-testid="fraud-window-overview"
            />
          )}
          <line
            x1={PAD_X}
            x2={WIDTH - PAD_X}
            y1={OVERVIEW_AXIS}
            y2={OVERVIEW_AXIS}
            className="stroke-border-strong"
          />
          {ticks(from, to, 6).map((tick) => (
            <text
              key={tick}
              x={xOverview(tick)}
              y={OVERVIEW_HEIGHT - 8}
              textAnchor="middle"
              className="fill-ink-muted text-[11px]"
            >
              {dayLabel(tick)}
            </text>
          ))}
          {marks.map((mark) => (
            <MarkShape
              key={mark.transactionNumber}
              mark={mark}
              x={xOverview(mark.millis)}
              y={
                mark.direction === "WITHDRAWAL"
                  ? OVERVIEW_AXIS + 22
                  : OVERVIEW_AXIS - 22
              }
              r={radius(mark.amount, 3.5)}
              id={
                hasWindow && inWindow(mark)
                  ? undefined
                  : `ledger-tx-${mark.transactionNumber}`
              }
              isFocused={mark.transactionNumber === focusedTransaction}
              onSelect={onSelectTransaction}
            />
          ))}
        </svg>
      </figure>

      {hasWindow && (
        <figure className="flex flex-col gap-1">
          <figcaption className="text-xs font-bold text-ink">
            다툼 거래 전후 24시간 창 확대
            <span className="ml-2 font-normal text-ink-muted">
              창 {hourLabel(windowFrom)} ~ {hourLabel(windowTo)} 중 거래가 있는
              구간, 60분 안 출금 {outflows.length}건
            </span>
          </figcaption>
          <svg
            viewBox={`0 0 ${WIDTH} ${ZOOM_HEIGHT}`}
            className={cn(
              "h-auto w-full border",
              fraudMatched
                ? "border-danger-border-soft bg-danger-tint"
                : "border-border bg-surface",
            )}
            role="group"
            aria-label="다툼 거래 전후 24시간 원장"
            data-testid="fraud-window"
          >
            <defs>
              <marker
                id={markerId}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" className="fill-danger" />
              </marker>
            </defs>
            <line
              x1={PAD_X}
              x2={WIDTH - PAD_X}
              y1={ZOOM_AXIS}
              y2={ZOOM_AXIS}
              className="stroke-border-strong"
            />
            {ticks(zoomFrom, zoomTo, 8).map((tick) => (
              <g key={tick}>
                <line
                  x1={xZoom(tick)}
                  x2={xZoom(tick)}
                  y1={ZOOM_AXIS - 4}
                  y2={ZOOM_AXIS + 4}
                  className="stroke-border-strong"
                />
                <text
                  x={xZoom(tick)}
                  y={ZOOM_HEIGHT - 8}
                  textAnchor="middle"
                  className="fill-ink-muted text-[11px]"
                >
                  {zoomTickLabel(tick)}
                </text>
              </g>
            ))}
            {outflows.map(({ deposit, withdrawal }) => {
              const x1 = xZoom(deposit.millis)
              const x2 = xZoom(withdrawal.millis)
              const y1 = ZOOM_AXIS - 40
              const y2 = ZOOM_AXIS + 40
              return (
                <path
                  key={`${deposit.transactionNumber}-${withdrawal.transactionNumber}`}
                  d={`M ${x1} ${y1 + 8} Q ${(x1 + x2) / 2 + 18} ${ZOOM_AXIS} ${x2} ${y2 - 10}`}
                  className="fill-none stroke-danger"
                  strokeWidth={1.5}
                  markerEnd={`url(#${markerId})`}
                  data-testid="outflow-arrow"
                >
                  <title>{`${formatAmount(deposit.amount)} 입금 뒤 ${Math.round((withdrawal.millis - deposit.millis) / 60000)}분 만에 ${formatAmount(withdrawal.amount)} 출금`}</title>
                </path>
              )
            })}
            {zoomMarks.map((mark) => (
              <MarkShape
                key={mark.transactionNumber}
                mark={mark}
                x={xZoom(mark.millis)}
                y={
                  mark.direction === "WITHDRAWAL"
                    ? ZOOM_AXIS + 40
                    : ZOOM_AXIS - 40
                }
                r={radius(mark.amount, 5)}
                id={`ledger-tx-${mark.transactionNumber}`}
                isFocused={mark.transactionNumber === focusedTransaction}
                onSelect={onSelectTransaction}
              />
            ))}
          </svg>
        </figure>
      )}

      <ul
        className="flex flex-wrap gap-x-4 gap-y-1 text-2xs text-ink-muted"
        aria-label="범례"
      >
        <LegendItem className="bg-warning" label="다툼 거래(판단 근거 아님)" />
        <LegendItem
          className={relationRule?.matched ? "bg-success" : "bg-ink-faint"}
          label={`관계 거래${relationRule?.matched ? "(관계 인정)" : ""}`}
        />
        <LegendItem
          className={fraudMatched ? "bg-danger" : "bg-ink-faint"}
          label={`사기 패턴 점검 거래${fraudMatched ? "(사기 패턴 해당)" : ""}`}
        />
        <LegendItem className="bg-ink-faint" label="그 밖의 입금(원)" />
        <LegendItem className="bg-ink-muted" label="출금(네모)" square />
        <li className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-danger" aria-hidden />
          60분 안 출금
        </li>
      </ul>
    </div>
  )
}
