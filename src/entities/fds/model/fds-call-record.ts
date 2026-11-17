import type { FdsHoldCallRecord } from "@/shared/api/generated"

export const latestFdsCallRecord = (
  records?: FdsHoldCallRecord[],
): FdsHoldCallRecord | undefined =>
  records == null
    ? undefined
    : [...records].sort((left, right) =>
        (right.recordedAt ?? "").localeCompare(left.recordedAt ?? ""),
      )[0]
