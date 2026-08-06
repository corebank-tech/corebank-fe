/**
 * B-07 계좌순서 변경 목업 데이터. REQ-ACCT-014.
 * 초기 배열 순서는 개설일 오름차순이 아닌 임의의 현재 표시순서로 구성해
 * [초기화] 동작(개설일 오름차순 복원)을 확인할 수 있게 한다.
 */

import type { AccountGroupId } from "@/entities/account/api/b01-accounts"

export type OrderAccount = {
  id: string
  group: AccountGroupId
  accountNo: string
  alias: string
  openedDate: string
  balance: number
}

export const MOCK_ORDER_ACCOUNTS: OrderAccount[] = [
  {
    id: "ord1",
    group: "checking",
    accountNo: "255104778910",
    alias: "비상금통장",
    openedDate: "2023-06-20",
    balance: 1_500_000,
  },
  {
    id: "ord2",
    group: "checking",
    accountNo: "110632892336",
    alias: "자유입출금",
    openedDate: "2021-03-14",
    balance: 12_340_500,
  },
  {
    id: "ord3",
    group: "deposit",
    accountNo: "110550051877",
    alias: "정기예금 1년",
    openedDate: "2026-01-10",
    balance: 10_000_000,
  },
  {
    id: "ord4",
    group: "checking",
    accountNo: "302998112233",
    alias: "급여통장",
    openedDate: "2019-11-02",
    balance: 3_860_000,
  },
  {
    id: "ord5",
    group: "deposit",
    accountNo: "110220093412",
    alias: "내집마련적금",
    openedDate: "2025-09-01",
    balance: 3_600_000,
  },
  {
    id: "ord6",
    group: "deposit",
    accountNo: "110770164529",
    alias: "여행적금",
    openedDate: "2026-04-05",
    balance: 900_000,
  },
]

/** REQ-ACCT-014: [초기화] 시 기본 순서(개설일 오름차순)로 복원한다. */
export function sortByOpenedDateAsc(accounts: OrderAccount[]): OrderAccount[] {
  return [...accounts].sort((a, b) => a.openedDate.localeCompare(b.openedDate))
}
