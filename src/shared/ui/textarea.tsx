import * as React from "react"
import { cn } from "@/shared/lib/utils"

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean
}

/** 여러 줄 입력. 테두리, 초점, 오류 표시는 `Input` 과 같다. */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "min-h-24 w-full rounded-md border bg-surface-elevated px-3 py-2 text-base leading-[1.5]",
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
Textarea.displayName = "Textarea"
