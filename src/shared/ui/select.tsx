import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/shared/lib/utils"

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => {
    return (
      <div className="relative inline-flex w-full items-center">
        <select
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-10 w-full appearance-none rounded-md border bg-surface-elevated pr-9 pl-3 text-base",
            "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring-soft focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-muted",
            invalid ? "border-danger" : "border-border-strong",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 h-4 w-4 text-ink-muted"
          aria-hidden="true"
        />
      </div>
    )
  },
)
Select.displayName = "Select"
