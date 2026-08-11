import type * as React from "react"
import { Alert } from "@/shared/ui/alert"

type SavedConditionAlertProps = {
  open: boolean
  /** 기본값은 "조회조건이 저장되었습니다." — 다운로드 완료 등 다른 문구가 필요하면 넘긴다. */
  message?: React.ReactNode
  className?: string
}

/** useSavedConditionAlert와 짝을 이루는 성공 알림. */
export const SavedConditionAlert = ({
  open,
  message = "조회조건이 저장되었습니다.",
  className,
}: SavedConditionAlertProps) => {
  if (!open) return null
  return (
    <Alert variant="success" className={className}>
      {message}
    </Alert>
  )
}
