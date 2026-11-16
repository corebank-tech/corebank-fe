/**
 * REQ-CMN-014: 결과를 모르는 해지 요청의 멱등키.
 *
 * 화면 안에만 두면 고객이 이전 단계로 갔다 돌아오는 순간 사라지고, 다시 보낸 요청이 새 키로
 * 나가 서버가 같은 해지를 새 거래로 처리할 수 있다. 그래서 탭 세션 저장소에 계좌와 해지
 * 유형별로 두고, 서버가 답하면(성공·거절) 지운다.
 */
import type { DepositTerminationKind } from "@/entities/account/lib/deposit-termination"

const storageKeyOf = (accountId: number, kind: DepositTerminationKind) =>
  `corebank:pending-termination-key:${accountId}:${kind}`

export const readPendingTerminationKey = (
  accountId: number,
  kind: DepositTerminationKind,
): string | null => {
  try {
    return sessionStorage.getItem(storageKeyOf(accountId, kind))
  } catch {
    return null
  }
}

/** 보관된 키를 이어 쓰고, 없으면 새로 만들어 보관한다. */
export const getOrCreatePendingTerminationKey = (
  accountId: number,
  kind: DepositTerminationKind,
): string => {
  const pending = readPendingTerminationKey(accountId, kind)
  if (pending != null) return pending

  const created = crypto.randomUUID()
  try {
    sessionStorage.setItem(storageKeyOf(accountId, kind), created)
  } catch {
    // 저장소를 못 쓰는 환경이면 이번 화면에서만 유지된다.
  }
  return created
}

export const clearPendingTerminationKey = (
  accountId: number,
  kind: DepositTerminationKind,
): void => {
  try {
    sessionStorage.removeItem(storageKeyOf(accountId, kind))
  } catch {
    // 지울 것이 없다.
  }
}
