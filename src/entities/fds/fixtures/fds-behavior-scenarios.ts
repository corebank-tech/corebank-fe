import type { FdsBehaviorEventType } from "@/entities/fds/model/fds-behavior-flow"

/** Storybook/MSW 시연이 사용하는 서버 판정 fixture. FE 판정 함수가 아니다. */
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
      // BE는 SUBMIT_REQUESTED 시 열린 확인 구간을 허용하지 않는다.
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
