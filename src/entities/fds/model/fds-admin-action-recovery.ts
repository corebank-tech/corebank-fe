import type { FdsDecision } from "@/entities/fds/model/fds-held-transfer-view"

export type PendingFdsAdminAction = {
  decision: FdsDecision
  idempotencyKey: string
  callRecordIdempotencyKey?: string
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
    // 저장소를 쓸 수 없으면 현재 요청은 계속하고 서버 상세 재조회로 복원한다.
  }
}

export const clearPendingFdsAdminAction = (transferHoldId: number) => {
  try {
    sessionStorage.removeItem(keyOf(transferHoldId))
  } catch {
    // 서버 상태가 정본이므로 로컬 정리에 실패해도 다음 상세 조회에서 완료로 수렴한다.
  }
}
