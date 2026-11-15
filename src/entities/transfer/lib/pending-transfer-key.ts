import type { TransferIntent } from "@/entities/transfer/lib/transfer-intent"

/**
 * REQ-TRSF-016: 응답을 받지 못한 이체의 멱등키와 거래 내용.
 *
 * 화면 state 에만 두면 고객이 이체결과조회로 이동하는 순간 사라지고, 돌아와 같은 내용을
 * 다시 보내면 새 키가 나가 첫 요청이 처리됐을 때 이중 출금이 된다. 그래서 탭 세션 저장소에
 * 둔다. 서버가 답하거나 고객이 새 이체를 시작하면 지운다.
 */
export type PendingTransferKey = {
  idempotencyKey: string
  intent: TransferIntent
}

const STORAGE_KEY = "corebank:pending-transfer-key"

export const readPendingTransferKey = (): PendingTransferKey | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw == null ? null : (JSON.parse(raw) as PendingTransferKey)
  } catch {
    return null
  }
}

export const writePendingTransferKey = (value: PendingTransferKey): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // 저장소를 못 쓰는 환경이면 화면 state 만으로 동작한다.
  }
}

export const clearPendingTransferKey = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // 지울 것이 없다.
  }
}
