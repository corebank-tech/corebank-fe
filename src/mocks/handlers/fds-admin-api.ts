import { http } from "msw"
import { ok } from "@/mocks/lib/envelope"
import { readStore, writeStore } from "@/mocks/lib/mock-store"
import type { FdsAdminActionState } from "@/entities/fds"

const stateKey = (id: string) => `fds:admin-action:${id}`

const readAction = (id: string) =>
  readStore<FdsAdminActionState | null>(stateKey(id), null)

const complete = (
  id: string,
  actionType: FdsAdminActionState["actionType"],
  reasonCode: string | null,
) => {
  const action: FdsAdminActionState = {
    actionId: `mock-action-${id}`,
    actionType,
    status: "COMPLETED",
    reasonCode,
    recoveryRequired: false,
  }
  writeStore(stateKey(id), action)
  return ok(action)
}

/** FDS 관리자 조치 목도 sessionStorage를 써서 새로고침 뒤 서버 재조회 장면을 재현한다. */
export const fdsAdminApiHandlers = [
  http.get("*/admin/fds/holds/:transferHoldId", ({ params }) => {
    const id = String(params.transferHoldId)
    const adminAction = readAction(id)
    return ok({
      transferHoldId: Number(id),
      holdStatus:
        adminAction?.actionType === "APPROVE"
          ? "EXECUTED"
          : adminAction
            ? "REJECTED"
            : "HELD",
      adminAction,
      riskRegistration:
        adminAction?.actionType === "FRAUD_REJECT"
          ? { status: "ACTIVE", recoveryRequired: false }
          : null,
    })
  }),

  http.post("*/admin/fds/holds/:transferHoldId/call-record", () =>
    ok({ recorded: true }),
  ),

  http.post("*/admin/fds/holds/:transferHoldId/approve", ({ params }) =>
    complete(String(params.transferHoldId), "APPROVE", null),
  ),

  http.post("*/admin/fds/holds/:transferHoldId/fraud-reject", ({ params }) =>
    complete(String(params.transferHoldId), "FRAUD_REJECT", "FRAUD_CONFIRMED"),
  ),

  http.post(
    "*/admin/fds/holds/:transferHoldId/reject",
    async ({ params, request }) => {
      const body = (await request.json()) as { reasonCode: string }
      return complete(String(params.transferHoldId), "REJECT", body.reasonCode)
    },
  ),
]
