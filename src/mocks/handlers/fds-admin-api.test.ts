import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest"
import { server } from "@/mocks/server"

const request = async (path: string, init?: RequestInit) => {
  const response = await fetch(`http://localhost/api/v1${path}`, init)
  return (await response.json()) as { data: unknown }
}

describe("FDS 관리자 MSW", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
  beforeEach(() => sessionStorage.clear())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it("같은 멱등키의 콜 기록 요청은 같은 결과를 반환하고 중복 저장하지 않는다", async () => {
    const init: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "call-key-1",
      },
      body: JSON.stringify({
        result: "NO_ANSWER",
        investigationReason: "연결되지 않음",
      }),
    }
    const first = await request("/admin/fds/holds/102/call-record", init)
    const second = await request("/admin/fds/holds/102/call-record", init)
    const detail = await request("/admin/fds/holds/102")
    const calls = (detail.data as { callRecords: { callRecordId: number }[] })
      .callRecords

    expect(second.data).toEqual(first.data)
    expect(
      calls.filter(
        (call) =>
          call.callRecordId ===
          (first.data as { callRecordId: number }).callRecordId,
      ),
    ).toHaveLength(1)
  })

  it("조치 후 목록도 저장된 최신 조치 상태를 반영한다", async () => {
    const init: RequestInit = {
      method: "POST",
      headers: { "Idempotency-Key": "approve-key-1" },
    }
    const first = await request("/admin/fds/holds/102/approve", init)
    const second = await request("/admin/fds/holds/102/approve", init)
    const list = await request("/admin/fds/holds?page=0&size=20")
    const row = (
      list.data as {
        items: { transferHoldId: number; latestActionStatus?: string }[]
      }
    ).items.find((item) => item.transferHoldId === 102)

    expect(second.data).toEqual(first.data)
    expect(row?.latestActionStatus).toBe("COMPLETED")
  })
})
