import * as React from "react"
import { cn } from "@/shared/lib/utils"
import { statusToneClasses } from "@/shared/ui/status-tone"

export type BadgeVariant =
  "primary" | "neutral" | "success" | "danger" | "warning"

const BADGE_VARIANT_CLASSES: Record<BadgeVariant, string> = {
  primary: statusToneClasses("primary"),
  neutral: "border-border bg-surface text-ink-muted",
  success: statusToneClasses("success"),
  danger: statusToneClasses("danger"),
  warning: statusToneClasses("warning"),
}

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

export const Badge = ({
  className,
  variant = "primary",
  ...props
}: BadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-1.5 py-0.5 text-xs leading-none font-bold whitespace-nowrap",
        BADGE_VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  )
}
