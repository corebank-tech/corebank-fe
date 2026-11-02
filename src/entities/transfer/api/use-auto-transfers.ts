/**
 * 자동이체 조회(G-04)·등록(G-01~G-03)·변경·해지. 생성 훅을 그대로 다시 내보낸다.
 *
 * 해지·변경은 호출마다 OtpModal이 발급한 Otp-Auth-Token이 달라서 훅이 아니라
 * 함수를 쓴다 — 훅은 request.headers를 훅 생성 시점에 고정한다.
 */
export {
  useSearchAutoTransfers as useAutoTransfers,
  useRegisterAutoTransfer as useRegisterAutoTransferMutation,
  cancelAutoTransfers,
  changeAutoTransfer,
} from "@/shared/api/generated"
export type { SearchAutoTransfersParams } from "@/shared/api/generated"
