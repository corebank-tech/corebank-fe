/**
 * 예약이체 취소(E-04)·자동이체 해지(G-04) 요청과 결과 판정.
 *
 * 서버는 취소·해지를 ID 배열로 받는다(corebank-server#330). OTP 토큰 하나가 그
 * 배열 전체를 덮고, 서버는 발급 시점 거래정보와 요청 본문의 배열을 대조한다 —
 * 어긋나면 OTP0102.
 */
import type {
  AutoTransferCancelItemResponse,
  AutoTransferCancelRequest,
  ScheduledTransferCancelItemResponse,
  ScheduledTransferCancelRequest,
} from "@/shared/api/generated"

/** 서버가 처리 전에 오름차순 정렬·중복 제거하므로 OTP 거래정보도 같은 규칙으로 만든다. */
const toCancelIds = (rowIds: readonly string[]): number[] =>
  [...new Set(rowIds.map(Number))].sort((a, b) => a - b)

/**
 * 해지 요청 본문. OTP 발급 거래정보(`transactionData`)도 이 객체를 그대로 쓴다 —
 * 서버가 대조하는 거래정보가 본문과 같은 `{ autoTransferIds }` 다. 두 자리에서 따로
 * 조립하면 키 이름이 갈려도 `transactionData` 가 unknown 맵이라 타입이 잡지 못한다.
 */
export const toAutoTransferCancelRequest = (
  rowIds: readonly string[],
): AutoTransferCancelRequest => ({ autoTransferIds: toCancelIds(rowIds) })

/** 취소 요청 본문. OTP 발급 거래정보도 이 객체를 그대로 쓴다 — 이유는 해지와 같다. */
export const toScheduledTransferCancelRequest = (
  rowIds: readonly string[],
): ScheduledTransferCancelRequest => ({
  scheduledTransferIds: toCancelIds(rowIds),
})

type CancelItemResult =
  AutoTransferCancelItemResponse | ScheduledTransferCancelItemResponse

/**
 * 취소·해지 응답에서 실패 안내 문구를 뽑는다. 전 건 성공이면 null.
 *
 * 취소·해지 불가(예정일 당일, 이미 종료된 건 등)는 예외가 아니라 200 응답의 건별
 * `status: ERROR` 로 온다. 예외만 실패로 보면 거부된 건을 성공으로 처리한다.
 *
 * SUCCESS 가 아니면 전부 실패로 본다. 스펙 enum 의 PROCESSING 은 서버가 공용
 * `ProcessResultStatus` 를 재사용해서 드러난 값이고 취소·해지 결과로는 만들지
 * 않지만, 온다면 반영됐다고 확정할 수 없다. 요청한 건수보다 결과가 적을 때도 같다.
 */
export const getCancelFailureMessage = (
  items: readonly CancelItemResult[] | undefined,
  requestedCount: number,
  fallback: string,
): string | null => {
  const results = items ?? []
  if (results.length < requestedCount) return fallback

  const failed = results.find((item) => item.status !== "SUCCESS")
  if (!failed) return null
  return failed.failureReason || fallback
}
