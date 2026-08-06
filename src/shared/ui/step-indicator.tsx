import * as React from "react"
import { cn } from "@/shared/lib/utils"

type StepIndicatorProps = {
  /** Ordered step labels, e.g. ["정보입력", "정보확인 및 인증", "완료"]. */
  steps: string[]
  /** 1-based index of the active step. */
  currentStep: number
}

/**
 * Right-aligned numbered step marker. Numbers 1..n are listed inline; the
 * current step alone shows its label with an underline. Completed and current
 * steps use the primary color, waiting steps use muted text.
 */
export const StepIndicator = ({ steps, currentStep }: StepIndicatorProps) => {
  return (
    <ol
      className="flex shrink-0 items-center gap-4"
      aria-label={`전체 ${steps.length}단계 중 ${currentStep}단계`}
    >
      {steps.map((label, i) => {
        const stepNo = i + 1
        const isCurrent = stepNo === currentStep
        const isDone = stepNo < currentStep
        const active = isCurrent || isDone
        return (
          <li
            key={label}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "flex items-center gap-1.5 text-base whitespace-nowrap tabular-nums",
              active ? "text-primary" : "text-ink-faint",
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border-strong bg-surface-elevated text-ink-faint",
              )}
            >
              {stepNo}
            </span>
            {isCurrent && (
              <span className="border-b-2 border-primary pb-0.5 font-bold whitespace-nowrap">
                {label}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
