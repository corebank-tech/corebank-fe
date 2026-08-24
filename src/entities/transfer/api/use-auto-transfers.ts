/**
 * 자동이체 조회(G-04)·등록(G-01~G-03)·변경·해지. 생성 훅을 그대로 다시 내보낸다.
 *
 * 해지·변경은 선택한 여러 건을 순차 처리해서 훅이 아니라 함수를 쓴다.
 */
export {
  useGetAutoTransfers as useAutoTransfers,
  useRegisterAutoTransfer as useRegisterAutoTransferMutation,
  cancelAutoTransfer,
  updateAutoTransfer,
} from "@/shared/api/generated"
export type { GetAutoTransfersParams } from "@/shared/api/generated"
