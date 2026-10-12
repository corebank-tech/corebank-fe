import type { BadgeVariant } from "@/shared/ui/badge"

export type AccountStatusLabel = "정상" | "거래정지" | "만기" | "해지"

const ACCOUNT_STATUS_BADGE: Record<AccountStatusLabel, BadgeVariant> = {
  정상: "success",
  거래정지: "danger",
  만기: "warning",
  해지: "danger",
}

export const getAccountStatusLabel = (
  status: string | undefined,
): AccountStatusLabel => {
  switch (status) {
    case "SUSPENDED":
      return "거래정지"
    case "MATURED":
      return "만기"
    case "CLOSED":
      return "해지"
    default:
      return "정상"
  }
}

export const getAccountStatusBadgeVariant = (
  status: AccountStatusLabel,
): BadgeVariant => ACCOUNT_STATUS_BADGE[status]
