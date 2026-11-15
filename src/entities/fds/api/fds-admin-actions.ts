import {
  approveFdsHeldTransfer as approveGenerated,
  confirmFraudAndRejectFdsHeldTransfer,
  getFdsHeldTransferDetail,
  getFdsHeldTransfers,
  recordFdsAdminCallResult as recordCallGenerated,
  rejectFdsHeldTransfer as rejectGenerated,
  useGetFdsHeldTransferDetail,
  useGetFdsHeldTransfers,
  type CallRequestResult,
  type FdsHoldDetail,
  type FdsHoldListItem,
  type FdsHoldListPage,
  type GetFdsHeldTransfersParams,
  type RejectRequestReasonCode,
  type Action,
} from "@/shared/api/generated"
import { withIdempotencyKey } from "@/shared/api/custom-fetch"

export const FDS_ACCESS_REASON = "INCIDENT"
const readOptions = { headers: { "X-Access-Reason": FDS_ACCESS_REASON } }
const writeOptions = (idempotencyKey: string) =>
  withIdempotencyKey(readOptions, idempotencyKey)

export type FdsGeneralRejectReason = RejectRequestReasonCode
export type FdsCallResult = CallRequestResult
export type FdsDecision = "APPROVE" | "REJECT" | "FRAUD_REJECT"
export type FdsAdminActionState = Action
export type {
  FdsHoldDetail,
  FdsHoldListItem,
  FdsHoldListPage,
  GetFdsHeldTransfersParams,
}

export const useFdsHeldTransfers = (params: GetFdsHeldTransfersParams) =>
  useGetFdsHeldTransfers(params, { request: readOptions })
export const useFdsHeldTransferDetail = (transferHoldId: number) =>
  useGetFdsHeldTransferDetail(transferHoldId, {
    query: {
      enabled: Number.isSafeInteger(transferHoldId) && transferHoldId > 0,
    },
    request: readOptions,
  })
export const fetchFdsHeldTransfers = (params: GetFdsHeldTransfersParams) =>
  getFdsHeldTransfers(params, readOptions)
export const fetchFdsHeldTransferDetail = (transferHoldId: number) =>
  getFdsHeldTransferDetail(transferHoldId, readOptions)
export const approveFdsHeldTransfer = (
  transferHoldId: number,
  idempotencyKey: string,
) => approveGenerated(transferHoldId, writeOptions(idempotencyKey))
export const rejectFdsHeldTransfer = (
  transferHoldId: number,
  reasonCode: FdsGeneralRejectReason,
  idempotencyKey: string,
) =>
  rejectGenerated(transferHoldId, { reasonCode }, writeOptions(idempotencyKey))
/** FRAUD_CONFIRMED는 일반 reject DTO가 아니라 전용 API로만 전송한다. */
export const fraudRejectFdsHeldTransfer = (
  transferHoldId: number,
  idempotencyKey: string,
) =>
  confirmFraudAndRejectFdsHeldTransfer(
    transferHoldId,
    writeOptions(idempotencyKey),
  )
export const recordFdsAdminCallResult = (
  transferHoldId: number,
  result: FdsCallResult,
  investigationReason: string,
  idempotencyKey: string,
) =>
  recordCallGenerated(
    transferHoldId,
    { result, investigationReason },
    writeOptions(idempotencyKey),
  )
