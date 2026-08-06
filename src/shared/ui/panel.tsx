import * as React from "react"
import { cn } from "@/shared/lib/utils"

type PanelProps = React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode
}

/** 헤더+본문으로 구성된 보더 패널 셸. 대시보드류 위젯 패널에 쓴다. */
export const Panel = ({ children, className, ...props }: PanelProps) => {
  return (
    <section
      className={cn(
        "overflow-hidden border border-border bg-surface-elevated",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  )
}

type PanelHeaderProps = {
  title: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export const PanelHeader = ({ title, action, className }: PanelHeaderProps) => {
  return (
    <div
      className={cn("flex items-center justify-between px-4 py-2.5", className)}
    >
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {action}
    </div>
  )
}
