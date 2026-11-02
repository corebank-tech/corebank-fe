/**
 * B-07 계좌순서 변경 목업 데이터. REQ-ACCT-014.
 * 초기 배열 순서는 개설일 오름차순이 아닌 임의의 현재 표시순서로 구성해
 * [초기화] 동작(개설일 오름차순 복원)을 확인할 수 있게 한다.
 */

import type { AccountItemResponse } from "@/shared/api/generated"

export type OrderAccount = {
  accountId: number
  accountName: string
  accountNo: string
  openedDate: string
  balance: number
  displayOrder: number
}

export const toOrderAccounts = (
  accounts: AccountItemResponse[],
): OrderAccount[] =>
  accounts
    .flatMap((account) => {
      if (account.accountId == null || account.accountNumber == null) {
        return []
      }

      return [
        {
          accountId: account.accountId,
          accountName: account.accountName ?? account.baseAccountName ?? "계좌",
          accountNo: account.accountNumber,
          openedDate: account.openedDate ?? "",
          balance: account.balance ?? 0,
          displayOrder: account.displayOrder ?? Number.MAX_SAFE_INTEGER,
        },
      ]
    })
    .sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder
      }

      return a.accountId - b.accountId
    })
