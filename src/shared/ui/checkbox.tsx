import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/shared/lib/utils"

type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: React.ReactNode
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const autoId = React.useId()
    const inputId = id ?? autoId
    return (
      <label
        htmlFor={inputId}
        className="inline-flex cursor-pointer items-center gap-2 text-base select-none"
      >
        <span className="relative inline-flex h-4.5 w-4.5 items-center justify-center">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            className={cn(
              "peer h-4.5 w-4.5 cursor-pointer appearance-none rounded-md border border-border-strong bg-surface-elevated",
              "checked:border-primary checked:bg-primary",
              "focus-visible:ring-2 focus-visible:ring-ring-soft focus-visible:outline-none",
              className,
            )}
            {...props}
          />
          <Check
            className="pointer-events-none absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100"
            strokeWidth={3}
            aria-hidden="true"
          />
        </span>
        {label != null && <span className="text-ink">{label}</span>}
      </label>
    )
  },
)
Checkbox.displayName = "Checkbox"
