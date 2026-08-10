import * as React from "react"
import { Check, X } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { Spinner } from "@/shared/ui/spinner"
import { STATUS_TONE_CLASSES } from "@/shared/ui/status-tone"

export type ResultVariant = "success" | "fail" | "pending"

const RESULT_ICON_RING_CLASSES: Record<ResultVariant, string> = {
  success: cn(STATUS_TONE_CLASSES.primary.bg, STATUS_TONE_CLASSES.primary.text),
  fail: cn(STATUS_TONE_CLASSES.danger.bg, STATUS_TONE_CLASSES.danger.text),
  pending: "bg-surface text-ink-muted",
}

const VARIANT_ICON: Partial<
  Record<
    ResultVariant,
    React.ComponentType<{ className?: string; strokeWidth?: number }>
  >
> = {
  success: Check,
  fail: X,
}

type ResultPanelProps<Row> = {
  variant: ResultVariant
  /** Bold headline, e.g. "이체가 완료되었습니다." */
  message: React.ReactNode
  /** One-line secondary guidance under the headline. */
  description?: React.ReactNode
  /** Label above the highlighted value, e.g. "이체금액". Defaults to "이체금액". */
  highlightLabel?: React.ReactNode
  /** Dominant value rendered at page-title weight, e.g. the transferred amount. */
  highlightValue?: React.ReactNode
  /** Column definitions for the single-row summary grid. */
  columns: DataGridColumn<Row>[]
  /** The single summary row rendered in the grid. */
  row: Row
  /** Bottom action button slot, e.g. [이체결과조회] [추가이체]. */
  actions?: React.ReactNode
  /** Small footnote under the summary grid, e.g. status-specific guidance. */
  footnote?: React.ReactNode
}

/**
 * D-03 결과 패널. Slots into StepLayout via the step-3 resultSlot: a 72px
 * status icon, a bold result message, one guidance line, a one-row summary
 * grid (reusing DataGrid), and a bottom action slot. This renders the step
 * body only — it never re-creates StepLayout.
 */
export const ResultPanel = <Row,>({
  variant,
  message,
  description,
  highlightLabel = "이체금액",
  highlightValue,
  columns,
  row,
  actions,
  footnote,
}: ResultPanelProps<Row>) => {
  const Icon = VARIANT_ICON[variant]

  return (
    <div>
      <div className="flex flex-col items-center py-4 text-center">
        <span
          className={cn(
            "inline-flex h-18 w-18 items-center justify-center rounded-full",
            RESULT_ICON_RING_CLASSES[variant],
          )}
          aria-hidden="true"
        >
          {Icon ? (
            <Icon className="h-9 w-9" strokeWidth={2.5} />
          ) : (
            <Spinner size="lg" />
          )}
        </span>
        <p className="mt-4 text-h2 font-bold text-balance text-ink">
          {message}
        </p>
        {description && (
          <p className="mt-2 text-base leading-relaxed text-ink-muted">
            {description}
          </p>
        )}
        {highlightValue != null && (
          <div className="mt-4 flex flex-col items-center gap-1">
            <span className="text-ink-muted">{highlightLabel}</span>
            <span className="text-page font-bold text-primary">
              {highlightValue}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <DataGrid columns={columns} rows={[row]} />
      </div>

      {footnote != null && (
        <p className="mt-3 text-center text-2xs text-ink-muted">{footnote}</p>
      )}

      {actions != null && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
