import * as React from "react"
import { cn } from "@/shared/lib/utils"

export type SummaryItem = {
  label: React.ReactNode
  value: React.ReactNode
  /** Right-align + tabular-nums for numeric values. Defaults to true. */
  numeric?: boolean
  /** Optional value color token, e.g. "var(--color-deposit)". */
  valueColor?: string
}

type SummaryRowProps = React.HTMLAttributes<HTMLDivElement> & {
  items: SummaryItem[]
  /** Label cell width in px. */
  labelWidth?: number
}

/**
 * Aggregate summary strip: repeating [label cell | value cell] pairs laid out
 * as a single bordered table row. Borders collapse via -ml-px overlap.
 */
export const SummaryRow = ({
  items,
  labelWidth = 120,
  className,
  ...props
}: SummaryRowProps) => {
  return (
    <div
      className={cn(
        "flex flex-wrap border-t border-l border-border",
        className,
      )}
      {...props}
    >
      {items.map((item, i) => (
        <div key={i} className="flex flex-1">
          <div
            className="flex shrink-0 items-center border-r border-b bg-surface px-3 py-2.5 text-[14px] font-bold whitespace-nowrap text-ink"
            style={{ minWidth: labelWidth }}
          >
            {item.label}
          </div>
          <div
            className={cn(
              "flex flex-1 items-center border-r border-b bg-surface-elevated px-3 py-2.5 text-[14px] whitespace-nowrap text-ink",
              (item.numeric ?? true) && "justify-end font-bold tabular-nums",
            )}
            style={item.valueColor ? { color: item.valueColor } : undefined}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}
