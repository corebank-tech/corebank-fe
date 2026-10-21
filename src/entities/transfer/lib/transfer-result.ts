import { TransferResponseStatus } from "@/shared/api/generated"

/**
 * 결과가 확정된 처리상태인지 본다. 서버 `ProcessResultStatus.isConfirmed()` 와 같은 판정이다.
 *
 * PROCESSING 은 응답 유실, TIMEOUT 은 대외 전문 무응답이라 상대 처리 여부를 모른다.
 * 미확정 건을 확정된 것처럼 다루면 고객이 같은 이체를 다시 보내 두 번 입금될 수 있다
 * (corebank-server docs/phase2/interbank_transfer_fe_handoff.md §5-1).
 *
 * 새 값이 생겨도 미확정으로 떨어지도록 긍정형으로 둔다 — 서버가 같은 이유로 긍정형을 쓴다.
 */
export const isConfirmedTransferStatus = (
  status: string | undefined,
): boolean =>
  status === TransferResponseStatus.SUCCESS ||
  status === TransferResponseStatus.ERROR
