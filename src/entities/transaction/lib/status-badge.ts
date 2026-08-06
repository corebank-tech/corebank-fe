import type { BadgeVariant } from "@/shared/ui/badge"
import type { AccountStatus } from "@/entities/transaction/api/transactions"

const ACCOUNT_STATUS_BADGE: Record<AccountStatus, BadgeVariant> = {
  정상: "success",
  거래정지: "warning",
  해지: "danger",
}

export function getAccountStatusBadgeVariant(
  status: AccountStatus,
): BadgeVariant {
  return ACCOUNT_STATUS_BADGE[status]
}
