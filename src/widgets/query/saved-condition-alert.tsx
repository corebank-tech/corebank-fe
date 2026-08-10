import { Alert } from "@/shared/ui/alert"

type SavedConditionAlertProps = {
  open: boolean
  className?: string
}

/** useSavedConditionAlert와 짝을 이루는 "조회조건이 저장되었습니다" 성공 알림. */
export const SavedConditionAlert = ({
  open,
  className,
}: SavedConditionAlertProps) => {
  if (!open) return null
  return (
    <Alert variant="success" className={className}>
      조회조건이 저장되었습니다.
    </Alert>
  )
}
