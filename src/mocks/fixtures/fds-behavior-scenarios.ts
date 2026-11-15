type FdsBehaviorEventType =
  | "TRANSFER_ENTER"
  | "RECIPIENT_CONFIRMED"
  | "AMOUNT_EDITED"
  | "STEP_BACK"
  | "CONFIRM_ENTER"
  | "CONFIRM_LEAVE"
  | "SUBMIT_REQUESTED"

/** Storybook/MSW 시연 전용 서버 판정 fixture. FE 판정 함수가 아니다. */
export const FDS_BEHAVIOR_SCENARIOS = {
  policyA: {
    eventTypes: [
      "TRANSFER_ENTER",
      "CONFIRM_ENTER",
      "CONFIRM_LEAVE",
      "STEP_BACK",
      "AMOUNT_EDITED",
      "CONFIRM_ENTER",
      "CONFIRM_LEAVE",
      "STEP_BACK",
      "AMOUNT_EDITED",
      "CONFIRM_ENTER",
      "CONFIRM_LEAVE",
      "SUBMIT_REQUESTED",
    ] satisfies FdsBehaviorEventType[],
    serverDecision: {
      backCount: 2,
      amountRevisionCount: 2,
      confirmActiveSeconds: 65,
      hesitationWarning: true,
      policyCode: "A" as const,
    },
  },
  policyB: {
    eventTypes: [
      "TRANSFER_ENTER",
      "CONFIRM_ENTER",
      "CONFIRM_LEAVE",
      "SUBMIT_REQUESTED",
    ] satisfies FdsBehaviorEventType[],
    serverDecision: {
      backCount: 0,
      amountRevisionCount: 0,
      confirmActiveSeconds: 12,
      hesitationWarning: false,
      policyCode: "B" as const,
    },
  },
} as const
