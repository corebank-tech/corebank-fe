import * as React from "react"
import { cn } from "@/shared/lib/utils"

export type ConfirmSummaryColumn = {
  /** Header cell label, e.g. "이체금액(원)". */
  label: React.ReactNode
  /** Value cell content. */
  value: React.ReactNode
  /** Render the value bold and larger (use for the amount column). */
  emphasis?: boolean
}

type ConfirmSummaryProps = React.HTMLAttributes<HTMLDivElement> & {
  columns: ConfirmSummaryColumn[]
}

/**
 * Horizontal review table for confirmation steps: one header row over one value
 * row, framed with a danger-colored 1px border to flag "review before submit".
 * The emphasized column renders its value bold and larger.
 */
export const ConfirmSummary = ({
  columns,
  className,
  ...props
}: ConfirmSummaryProps) => {
  return (
    <div
      className={cn("overflow-hidden border border-danger", className)}
      {...props}
    >
      <table className="w-full border-collapse text-base">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                scope="col"
                className={cn(
                  "border-b border-danger bg-danger-tint px-3 py-2.5 text-center whitespace-nowrap [&:not(:first-child)]:border-l [&:not(:first-child)]:border-border",
                  col.emphasis
                    ? "text-base font-bold text-ink"
                    : "text-base text-ink-muted",
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {columns.map((col, i) => (
              <td
                key={i}
                className={cn(
                  "bg-surface-elevated px-3 py-3 text-center align-middle whitespace-nowrap text-ink [&:not(:first-child)]:border-l [&:not(:first-child)]:border-border",
                  col.emphasis
                    ? "text-h2 font-bold text-primary"
                    : "text-base font-bold",
                )}
              >
                {col.value}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
