import { describe, expect, it } from "vitest"
import { createFdsBehaviorFlow } from "@/entities/fds/model/fds-behavior-flow"

const eventTypes = (flow: ReturnType<typeof createFdsBehaviorFlow>) =>
  flow.batch().events.map((event) => event.eventType)

describe("FDS 행동 흐름", () => {
  it("첫 복귀는 STEP_BACK 한 건이고 같은 동작의 중복 호출은 무시한다", () => {
    const flow = createFdsBehaviorFlow({ flowId: "flow-1" })
    flow.enterConfirm(100_000)

    expect(flow.returnToInput()).toBe(true)
    expect(flow.returnToInput()).toBe(false)
    expect(
      eventTypes(flow).filter((type) => type === "STEP_BACK"),
    ).toHaveLength(1)
  })

  it("확인 화면에 다시 진입한 뒤 복귀하면 STEP_BACK이 두 건 누적된다", () => {
    const flow = createFdsBehaviorFlow({ flowId: "flow-1" })
    flow.enterConfirm(100_000)
    flow.returnToInput()
    flow.enterConfirm(200_000)
    flow.returnToInput()

    expect(
      eventTypes(flow).filter((type) => type === "STEP_BACK"),
    ).toHaveLength(2)
    expect(
      eventTypes(flow).filter((type) => type === "AMOUNT_EDITED"),
    ).toHaveLength(1)
  })

  it("연속 입력이 아니라 확인 화면에 확정한 금액의 변경만 AMOUNT_EDITED로 센다", () => {
    const flow = createFdsBehaviorFlow({ flowId: "flow-1" })
    flow.enterConfirm(100_000)
    flow.returnToInput()
    flow.enterConfirm(123_456)

    expect(
      eventTypes(flow).filter((type) => type === "AMOUNT_EDITED"),
    ).toHaveLength(1)
  })

  it("visible인 확인 구간만 초 단위로 합산하고 backCount 계산값은 보내지 않는다", () => {
    let tick = 0
    const flow = createFdsBehaviorFlow({
      flowId: "flow-1",
      clock: { now: () => new Date(0), performanceNow: () => tick },
      initiallyVisible: true,
    })
    flow.enterConfirm(100_000)
    tick = 30_500
    flow.setVisible(false)
    tick = 90_500
    flow.setVisible(true)
    tick = 120_400
    flow.leaveConfirm()
    flow.submitRequested()

    expect(flow.batch()).toMatchObject({ confirmActiveSeconds: 60 })
    expect(flow.batch()).not.toHaveProperty("backCount")
  })

  it("새 흐름은 새 flowId를 받고 같은 흐름 객체는 재사용해도 유지한다", () => {
    const first = createFdsBehaviorFlow()
    const sameRenderReference = first
    const nextTransfer = createFdsBehaviorFlow()

    expect(sameRenderReference.flowId).toBe(first.flowId)
    expect(sameRenderReference.idempotencyKey).toBe(first.idempotencyKey)
    expect(nextTransfer.flowId).not.toBe(first.flowId)
  })
})
