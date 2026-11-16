import { http } from "msw"
import { fail, ok } from "@/mocks/lib/envelope"
import { readStore, writeStore } from "@/mocks/lib/mock-store"
import { FDS_ADMIN_DETAILS, FDS_ADMIN_LIST } from "@/mocks/fixtures/fds-admin"
import type {
  AdminAction,
  FdsHoldCallRecord,
  FdsHoldDetail,
  FdsHoldListItem,
} from "@/shared/api/generated"

const actionKey = (id: number) => `fds:admin-action:${id}`
const callsKey = (id: number) => `fds:calls:${id}`
const idempotencyKey = (id: number, operation: string, key: string) =>
  `fds:idempotency:${id}:${operation}:${key}`
const detailOf = (id: number): FdsHoldDetail | null => {
  const fixture = FDS_ADMIN_DETAILS[id]
  if (!fixture) return null
  return {
    ...fixture,
    adminAction: readStore<AdminAction | undefined>(actionKey(id), undefined),
    callRecords: readStore<FdsHoldCallRecord[]>(
      callsKey(id),
      fixture.callRecords ?? [],
    ),
  }
}
const complete = (
  id: number,
  operation: string,
  key: string,
  actionType: string,
  reasonCode?: string,
) => {
  const stored = readStore<AdminAction | null>(
    idempotencyKey(id, operation, key),
    null,
  )
  if (stored) return ok(stored)
  const action: AdminAction = {
    actionId: `mock-action-${id}`,
    actionType,
    status: "COMPLETED",
    reasonCode,
    recoveryRequired: false,
    updatedAt: new Date().toISOString(),
  }
  writeStore(actionKey(id), action)
  writeStore(idempotencyKey(id, operation, key), action)
  return ok(action)
}

const requestIdempotencyKey = (request: Request) =>
  request.headers.get("Idempotency-Key") ?? "missing"
const latestCallRecord = (records?: FdsHoldCallRecord[]) =>
  records == null
    ? undefined
    : [...records].sort((left, right) =>
        (right.recordedAt ?? "").localeCompare(left.recordedAt ?? ""),
      )[0]

export const fdsAdminApiHandlers = [
  http.get("*/admin/fds/holds", ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get("page") ?? 0)
    const size = Number(url.searchParams.get("size") ?? 20)
    const currentRows: FdsHoldListItem[] = FDS_ADMIN_LIST.map((row) => {
      const detail = detailOf(row.transferHoldId ?? 0)
      return {
        ...row,
        latestCallResult: latestCallRecord(detail?.callRecords)?.callResult,
        latestActionStatus: detail?.adminAction?.status,
      }
    })
    const filtered = currentRows.filter((row) =>
      (
        [
          "holdStatus",
          "policyCode",
          "riskStatus",
          "investigationStatus",
        ] as const
      ).every((key) => {
        const expected = url.searchParams.get(key)
        const actual = key === "riskStatus" ? row.riskAccountStatus : row[key]
        return !expected || actual === expected
      }),
    )
    return ok({
      items: filtered.slice(page * size, (page + 1) * size),
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / size),
    })
  }),
  http.get("*/admin/fds/holds/:transferHoldId", ({ params }) => {
    const detail = detailOf(Number(params.transferHoldId))
    return detail
      ? ok(detail)
      : fail("FDS0404", "존재하지 않는 보류 사건입니다.", 404)
  }),
  http.post(
    "*/admin/fds/holds/:transferHoldId/call-record",
    async ({ params, request }) => {
      const id = Number(params.transferHoldId)
      const body = (await request.json()) as {
        result: string
        investigationReason: string
      }
      const key = requestIdempotencyKey(request)
      const stored = readStore<FdsHoldCallRecord | null>(
        idempotencyKey(id, "call-record", key),
        null,
      )
      if (stored) return ok(stored)
      const calls = detailOf(id)?.callRecords ?? []
      const record: FdsHoldCallRecord = {
        callRecordId: Date.now(),
        callResult: body.result,
        adminId: 1,
        investigationReason: body.investigationReason,
        recordedAt: new Date().toISOString(),
        selectedByAction: false,
      }
      writeStore(callsKey(id), [...calls, record])
      writeStore(idempotencyKey(id, "call-record", key), record)
      return ok(record)
    },
  ),
  http.post(
    "*/admin/fds/holds/:transferHoldId/approve",
    ({ params, request }) =>
      complete(
        Number(params.transferHoldId),
        "approve",
        requestIdempotencyKey(request),
        "APPROVE",
      ),
  ),
  http.post(
    "*/admin/fds/holds/:transferHoldId/reject",
    async ({ params, request }) => {
      const body = (await request.json()) as { reasonCode: string }
      return complete(
        Number(params.transferHoldId),
        "reject",
        requestIdempotencyKey(request),
        "REJECT",
        body.reasonCode,
      )
    },
  ),
  http.post(
    "*/admin/fds/holds/:transferHoldId/fraud-reject",
    ({ params, request }) =>
      complete(
        Number(params.transferHoldId),
        "fraud-reject",
        requestIdempotencyKey(request),
        "FRAUD_REJECT",
        "FRAUD_CONFIRMED",
      ),
  ),
]
