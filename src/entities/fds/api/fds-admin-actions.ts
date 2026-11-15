import { customFetch, withIdempotencyKey } from "@/shared/api/custom-fetch"

export type FdsGeneralRejectReason = "CUSTOMER_DENIED" | "RISK_ACCOUNT_MATCH"

export type FdsAdminActionState = {
  actionId?: string
  actionType: "APPROVE" | "REJECT" | "FRAUD_REJECT"
  status: "PENDING" | "COMPLETED" | "FAILED" | "CONFLICT"
  reasonCode?: string | null
  failureReason?: string | null
  recoveryRequired?: boolean
}

export type FdsHeldTransferActionDetail = {
  transferHoldId: number
  holdStatus: string
  adminAction?: FdsAdminActionState | null
  riskRegistration?: {
    status: "PENDING" | "ACTIVE" | "FAILED"
    failureReason?: string | null
    recoveryRequired?: boolean
  } | null
}

const actionPath = (heldTransferId: number, action: string) =>
  `/admin/fds/holds/${heldTransferId}/${action}`

const post = (path: string, idempotencyKey: string, body?: unknown) =>
  customFetch<FdsAdminActionState>(
    path,
    withIdempotencyKey(
      {
        method: "POST",
        ...(body !== undefined && { body: JSON.stringify(body) }),
      },
      idempotencyKey,
    ),
  )

export const approveFdsHeldTransfer = (
  heldTransferId: number,
  idempotencyKey: string,
) => post(actionPath(heldTransferId, "approve"), idempotencyKey)

export const rejectFdsHeldTransfer = (
  heldTransferId: number,
  reasonCode: FdsGeneralRejectReason,
  idempotencyKey: string,
) => post(actionPath(heldTransferId, "reject"), idempotencyKey, { reasonCode })

/** FRAUD_CONFIRMED는 일반 reject DTO에 넣지 않고 전용 API로 보낸다. */
export const fraudRejectFdsHeldTransfer = (
  heldTransferId: number,
  idempotencyKey: string,
) => post(actionPath(heldTransferId, "fraud-reject"), idempotencyKey)

export const recordFdsAdminCallResult = (
  heldTransferId: number,
  result:
    "CUSTOMER_CONFIRMED" | "CUSTOMER_DENIED" | "NO_ANSWER" | "INCONCLUSIVE",
  investigationReason: string,
  idempotencyKey: string,
) =>
  customFetch<unknown>(
    actionPath(heldTransferId, "call-record"),
    withIdempotencyKey(
      {
        method: "POST",
        headers: { "X-Access-Reason": "INCIDENT" },
        body: JSON.stringify({ result, investigationReason }),
      },
      idempotencyKey,
    ),
  )

/** 새로고침·응답 유실 뒤 서버의 내구화된 관리자 조치를 정본으로 복원한다. */
export const getFdsHeldTransferActionDetail = (heldTransferId: number) =>
  customFetch<FdsHeldTransferActionDetail>(
    `/admin/fds/holds/${heldTransferId}`,
    { headers: { "X-Access-Reason": "INCIDENT" } },
  )
