import { readStore, writeStore } from "@/mocks/lib/mock-store"

const TERMINATED_KEY = "terminated-deposit-account-ids"

/** 해지 실행으로 종료된 예·적금 계좌 ID. 전체계좌 개요 목이 이 계좌를 빼고 응답한다. */
export const readTerminatedAccountIds = (): number[] =>
  readStore<number[]>(TERMINATED_KEY, [])

export const markAccountTerminated = (accountId: number): void => {
  writeStore(TERMINATED_KEY, [...readTerminatedAccountIds(), accountId])
}

const PAYOUTS_KEY = "termination-payouts"

/** 해지 지급액을 받은 수취 계좌 ID → 누적 입금액. 전체계좌 개요 목이 잔액에 더한다. */
export const readTerminationPayouts = (): Record<string, number> =>
  readStore<Record<string, number>>(PAYOUTS_KEY, {})

export const recordTerminationPayout = (
  withdrawalAccountId: number,
  amount: number,
): void => {
  const payouts = readTerminationPayouts()
  writeStore(PAYOUTS_KEY, {
    ...payouts,
    [withdrawalAccountId]: (payouts[withdrawalAccountId] ?? 0) + amount,
  })
}
