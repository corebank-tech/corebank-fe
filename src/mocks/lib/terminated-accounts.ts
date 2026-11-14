import { readStore, writeStore } from "@/mocks/lib/mock-store"

const TERMINATED_KEY = "terminated-deposit-account-ids"

/** 해지 실행으로 종료된 예·적금 계좌 ID. 전체계좌 개요 목이 이 계좌를 빼고 응답한다. */
export const readTerminatedAccountIds = (): number[] =>
  readStore<number[]>(TERMINATED_KEY, [])

export const markAccountTerminated = (accountId: number): void => {
  writeStore(TERMINATED_KEY, [...readTerminatedAccountIds(), accountId])
}
