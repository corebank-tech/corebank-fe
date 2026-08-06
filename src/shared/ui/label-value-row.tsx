import * as React from "react"
import { cn } from "@/shared/lib/utils"

type LabelValueRowProps = React.HTMLAttributes<HTMLDivElement> & {
  label: React.ReactNode
  value: React.ReactNode
  labelWidth?: number
}

/** 라벨 셀 + 값 셀 한 행. 세로로 쌓이는 상세정보 리스트(접속현황 등)에 쓴다. */
export const LabelValueRow = ({
  label,
  value,
  labelWidth = 120,
  className,
  ...props
}: LabelValueRowProps) => {
  return (
    <div className={cn("flex items-stretch", className)} {...props}>
      <div
        className="flex shrink-0 items-center bg-surface px-3 py-2.5 text-base font-bold text-ink"
        style={{ width: labelWidth }}
      >
        {label}
      </div>
      <div className="flex min-w-0 flex-1 items-center border-l border-border px-3 py-2.5 text-base whitespace-nowrap text-ink-muted tabular-nums">
        {value}
      </div>
    </div>
  )
}
