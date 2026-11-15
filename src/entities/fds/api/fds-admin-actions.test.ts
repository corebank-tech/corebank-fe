import { afterEach, describe, expect, it, vi } from "vitest"
import {
  fraudRejectFdsHeldTransfer,
  rejectFdsHeldTransfer,
} from "@/entities/fds/api/fds-admin-actions"

describe("FDS 관리자 거절 API", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("일반 거절은 reject DTO에 CUSTOMER_DENIED를 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: "0000", message: "ok", data: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await rejectFdsHeldTransfer(10, "CUSTOMER_DENIED", "idem-1")

    expect(fetchMock.mock.calls[0]?.[0]).toContain("/admin/fds/holds/10/reject")
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(
      JSON.stringify({ reasonCode: "CUSTOMER_DENIED" }),
    )
  })

  it("사기 확정은 reason DTO 없이 fraud-reject 전용 API를 쓴다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: "0000", message: "ok", data: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    vi.stubGlobal("fetch", fetchMock)

    await fraudRejectFdsHeldTransfer(10, "idem-2")

    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      "/admin/fds/holds/10/fraud-reject",
    )
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBeUndefined()
  })
})
