import * as React from "react"
import { NoticeBox } from "@/shared/ui/notice-box"
import { StepIndicator } from "@/shared/ui/step-indicator"

type StepLayoutProps = {
  /** Ordered step labels shared across the whole flow. */
  steps: string[]
  /** 1-based index of the active step. */
  currentStep: number
  title: React.ReactNode
  /** Notice items shown above the step body. Omit to hide the notice box. */
  notice?: React.ReactNode[]
  noticeTitle?: React.ReactNode
  /** Centered action buttons pinned below the body. */
  footer?: React.ReactNode
  children: React.ReactNode
}

/**
 * Generic multi-step transaction scaffold. Reused across the sign-up,
 * product-subscription, and transfer flows: a title row carrying the step
 * marker on its right, an optional notice, the step body, and a centered
 * action area at the bottom.
 */
export const StepLayout = ({
  steps,
  currentStep,
  title,
  notice,
  noticeTitle,
  footer,
  children,
}: StepLayoutProps) => {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-page font-bold text-balance text-ink">{title}</h1>
        <StepIndicator steps={steps} currentStep={currentStep} />
      </div>

      {notice && notice.length > 0 && (
        <div className="mb-6">
          <NoticeBox title={noticeTitle} items={notice} />
        </div>
      )}

      <div className="border border-border bg-surface-elevated p-6">
        {children}
      </div>

      {footer != null && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {footer}
        </div>
      )}
    </div>
  )
}
