import type {
  FdsDecision,
  FdsGeneralRejectReason,
} from "@/entities/fds/api/fds-admin-actions"

export type PendingFdsAdminAction = {
  actionType: FdsDecision
  reasonCode: FdsGeneralRejectReason | "FRAUD_CONFIRMED" | null
  idempotencyKey: string
}
const keyOf = (transferHoldId: number) =>
  `corebank:fds-admin-action:${transferHoldId}`
export const readPendingFdsAdminAction = (
  transferHoldId: number,
): PendingFdsAdminAction | null => {
  try {
    const raw = sessionStorage.getItem(keyOf(transferHoldId))
    return raw == null ? null : (JSON.parse(raw) as PendingFdsAdminAction)
  } catch {
    return null
  }
}
export const writePendingFdsAdminAction = (
  transferHoldId: number,
  pending: PendingFdsAdminAction,
) => {
  try {
    sessionStorage.setItem(keyOf(transferHoldId), JSON.stringify(pending))
  } catch {
    /* 서버 상세이 최종 정본이다. */
  }
}
export const clearPendingFdsAdminAction = (transferHoldId: number) => {
  try {
    sessionStorage.removeItem(keyOf(transferHoldId))
  } catch {
    /* 서버 상태로 수렴한다. */
  }
}
