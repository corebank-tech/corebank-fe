import * as React from "react"
import { cn } from "@/shared/lib/utils"

type FormRowProps = React.HTMLAttributes<HTMLDivElement> & {
  label: React.ReactNode
  required?: boolean
  htmlFor?: string
  labelWidth?: number
}

/**
 * A single label/field row. Stack multiple FormRow siblings to form a table;
 * borders collapse via first:border-t so the group reads as one bordered block.
 */
export const FormRow = ({
  label,
  required,
  htmlFor,
  labelWidth = 160,
  className,
  children,
  ...props
}: FormRowProps) => {
  return (
    <div
      className={cn(
        "flex border-r border-b border-l first:border-t",
        className,
      )}
      {...props}
    >
      <div
        className="flex shrink-0 items-center border-r bg-surface px-4 py-3"
        style={{ width: labelWidth }}
      >
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-1 text-base leading-[1.5] font-bold text-ink"
        >
          {required && (
            <span className="text-2xs leading-[1.5] font-bold whitespace-nowrap text-danger">
              [필수]
            </span>
          )}
          {label}
        </label>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 bg-surface-elevated px-4 py-3">
        {children}
      </div>
    </div>
  )
}
