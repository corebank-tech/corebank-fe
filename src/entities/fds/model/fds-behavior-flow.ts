export type FdsBehaviorEventType =
  | "TRANSFER_ENTER"
  | "RECIPIENT_CONFIRMED"
  | "AMOUNT_EDITED"
  | "STEP_BACK"
  | "CONFIRM_ENTER"
  | "CONFIRM_LEAVE"
  | "SUBMIT_REQUESTED"

export type FdsBehaviorStep = "D-01" | "D-02"

export type FdsBehaviorEvent = {
  flowId: string
  seqNo: number
  eventType: FdsBehaviorEventType
  occurredAt: string
  step: FdsBehaviorStep
}

export type FdsBehaviorEventBatch = {
  events: FdsBehaviorEvent[]
  confirmActiveSeconds?: number
}

type FlowClock = {
  now: () => Date
  performanceNow: () => number
}

const defaultClock: FlowClock = {
  now: () => new Date(),
  performanceNow: () => performance.now(),
}

/**
 * D-01/D-02 행동을 서버 계약의 원시 이벤트로만 수집한다. backCount나 정책은 계산하지
 * 않는다. 라우터와 버튼은 모두 `returnToInput`을 호출하며, 열린 확인 구간 하나를
 * 닫은 호출만 STEP_BACK을 만들기 때문에 같은 복귀의 중복 호출은 무시된다.
 */
export const createFdsBehaviorFlow = ({
  flowId = crypto.randomUUID(),
  idempotencyKey = crypto.randomUUID(),
  clock = defaultClock,
  initiallyVisible = document.visibilityState === "visible",
}: {
  flowId?: string
  idempotencyKey?: string
  clock?: FlowClock
  initiallyVisible?: boolean
} = {}) => {
  const events: FdsBehaviorEvent[] = []
  let confirmOpen = false
  let visible = initiallyVisible
  let activeSince: number | null = null
  let confirmActiveMs = 0
  let lastConfirmedAmount: number | null = null
  let submitted = false

  const append = (eventType: FdsBehaviorEventType, step: FdsBehaviorStep) => {
    events.push({
      flowId,
      seqNo: events.length + 1,
      eventType,
      occurredAt: clock.now().toISOString(),
      step,
    })
  }

  const stopActiveTimer = () => {
    if (activeSince == null) return
    confirmActiveMs += Math.max(0, clock.performanceNow() - activeSince)
    activeSince = null
  }

  const leaveConfirm = () => {
    if (!confirmOpen) return false
    stopActiveTimer()
    confirmOpen = false
    append("CONFIRM_LEAVE", "D-02")
    return true
  }

  append("TRANSFER_ENTER", "D-01")

  return {
    flowId,
    /** 네트워크 재시도에서도 같은 최종 이벤트 배치는 같은 요청으로 취급한다. */
    idempotencyKey,
    recipientConfirmed() {
      append("RECIPIENT_CONFIRMED", "D-01")
    },
    enterConfirm(amount: number) {
      if (confirmOpen || submitted) return false
      if (lastConfirmedAmount != null && lastConfirmedAmount !== amount) {
        append("AMOUNT_EDITED", "D-01")
      }
      lastConfirmedAmount = amount
      confirmOpen = true
      append("CONFIRM_ENTER", "D-02")
      if (visible) activeSince = clock.performanceNow()
      return true
    },
    leaveConfirm,
    returnToInput() {
      if (!leaveConfirm()) return false
      append("STEP_BACK", "D-01")
      return true
    },
    setVisible(nextVisible: boolean) {
      if (visible === nextVisible) return
      visible = nextVisible
      if (!confirmOpen) return
      if (visible) activeSince = clock.performanceNow()
      else stopActiveTimer()
    },
    submitRequested() {
      if (confirmOpen || submitted) return false
      submitted = true
      append("SUBMIT_REQUESTED", "D-02")
      return true
    },
    batch(): FdsBehaviorEventBatch {
      return {
        events: [...events],
        ...(submitted && {
          confirmActiveSeconds: Math.floor(confirmActiveMs / 1_000),
        }),
      }
    },
  }
}

export type FdsBehaviorFlow = ReturnType<typeof createFdsBehaviorFlow>
