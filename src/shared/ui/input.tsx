import * as React from "react"
import { cn } from "@/shared/lib/utils"

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-10 w-full rounded-md border bg-surface-elevated px-3 text-base",
          "placeholder:text-ink-faint",
          "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring-soft focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-muted",
          invalid
            ? "border-danger focus-visible:border-danger focus-visible:ring-danger-ring"
            : "border-border-strong",
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"
