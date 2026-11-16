import { customFetch, withIdempotencyKey } from "@/shared/api/custom-fetch"
import type { FdsBehaviorEventBatch } from "@/entities/fds/model/fds-behavior-flow"

export const submitFdsBehaviorEvents = (
  flowId: string,
  batch: FdsBehaviorEventBatch,
  idempotencyKey: string,
) =>
  customFetch<{ flowId?: string; acceptedCount?: number }>(
    `/fds/behavior-flows/${encodeURIComponent(flowId)}/events`,
    withIdempotencyKey(
      { method: "POST", body: JSON.stringify(batch) },
      idempotencyKey,
    ),
  )
