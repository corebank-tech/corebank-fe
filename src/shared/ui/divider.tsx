import { cn } from "@/shared/lib/utils"

/** 헤더·툴바·푸터에서 각자 만들던 `|` 구분자 span을 하나로 모은 것이다. */
type DividerTone = "border-strong" | "ink-faint" | "footer-divider"

const DIVIDER_TONE_CLASSES: Record<DividerTone, string> = {
  "border-strong": "text-border-strong",
  "ink-faint": "text-ink-faint",
  "footer-divider": "text-footer-divider",
}

type DividerProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: DividerTone
}

export const Divider = ({
  className,
  tone = "border-strong",
  ...props
}: DividerProps) => {
  return (
    <span
      aria-hidden="true"
      className={cn(DIVIDER_TONE_CLASSES[tone], className)}
      {...props}
    >
      |
    </span>
  )
}
