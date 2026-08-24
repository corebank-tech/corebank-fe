/**
 * 예약이체 조회(E-04)·등록(E-01~E-03)·취소. 생성 훅을 그대로 다시 내보낸다.
 *
 * 취소는 선택한 여러 건을 순차 처리하고 매 호출마다 실제 Otp-Auth-Token이
 * 달라져서(OtpModal에서 검증 성공 시 발급) 훅이 아니라 함수를 쓴다 — 훅은
 * request.headers를 훅 생성 시점에 고정한다.
 */
export {
  useSearchScheduledTransfers as useScheduledTransfers,
  cancelScheduledTransfer,
  useRegisterScheduledTransfer as useRegisterScheduledTransferMutation,
} from "@/shared/api/generated"
export type { SearchScheduledTransfersParams } from "@/shared/api/generated"
