import * as React from "react"
import { Info, CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { STATUS_TONE_CLASSES } from "@/shared/ui/status-tone"

type AlertVariant = "info" | "success" | "warning" | "danger"

const ALERT_VARIANT_CLASSES: Record<AlertVariant, string> = {
  info: cn(
    STATUS_TONE_CLASSES.primary.border,
    STATUS_TONE_CLASSES.primary.bg,
    "text-ink",
  ),
  success: cn(
    STATUS_TONE_CLASSES.success.border,
    STATUS_TONE_CLASSES.success.bg,
    "text-ink",
  ),
  warning: cn(
    STATUS_TONE_CLASSES.warning.border,
    STATUS_TONE_CLASSES.warning.bg,
    "text-ink",
  ),
  danger: cn(
    STATUS_TONE_CLASSES.danger.border,
    STATUS_TONE_CLASSES.danger.bg,
    "text-ink",
  ),
}

const ALERT_ICON_CLASSES: Record<AlertVariant, string> = {
  info: STATUS_TONE_CLASSES.primary.text,
  success: STATUS_TONE_CLASSES.success.text,
  warning: STATUS_TONE_CLASSES.warning.text,
  danger: STATUS_TONE_CLASSES.danger.text,
}

const ICONS: Record<
  AlertVariant,
  React.ComponentType<{ className?: string }>
> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
}

type AlertProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
  variant?: AlertVariant
  title?: React.ReactNode
}

export const Alert = ({
  className,
  variant = "info",
  title,
  children,
  ...props
}: AlertProps) => {
  const Icon = ICONS[variant]
  return (
    <div
      role="alert"
      className={cn(
        "flex gap-2 rounded-md border p-3 text-base",
        ALERT_VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      <Icon
        className={cn("mt-0.5 h-4 w-4 shrink-0", ALERT_ICON_CLASSES[variant])}
        aria-hidden="true"
      />
      <div className="min-w-0">
        {title != null && <p className="mb-0.5 font-bold">{title}</p>}
        {children != null && <div className="text-ink">{children}</div>}
      </div>
    </div>
  )
}
