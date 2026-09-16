/**
 * B-06 계좌별명 관리 목업 데이터. REQ-ACCT-013.
 * 별명이 없으면(alias=null) 목록·이체 등 전 화면에 productName(상품명)이 표시된다.
 */

import type { AccountItemResponse } from "@/shared/api/generated"

export type AliasAccount = {
  accountId: number
  accountNo: string
  productName: string
  alias: string | null
}

export const ALIAS_KOREAN_MAX = 12
export const ALIAS_ALNUM_MAX = 24

/** REQ-ACCT-013: 별명은 한글 12자 / 영문·숫자 24자 이내. */
export function isAliasLengthValid(value: string): boolean {
  const isAlnumOnly = /^[A-Za-z0-9]*$/.test(value)
  return isAlnumOnly
    ? value.length <= ALIAS_ALNUM_MAX
    : value.length <= ALIAS_KOREAN_MAX
}

export const toAliasAccounts = (
  accounts: AccountItemResponse[],
): AliasAccount[] =>
  accounts.flatMap((account) => {
    if (account.accountId == null || account.accountNumber == null) {
      return []
    }

    return [
      {
        accountId: account.accountId,
        accountNo: account.accountNumber,
        productName: account.baseAccountName ?? account.accountName ?? "계좌",
        alias: account.alias ?? null,
      },
    ]
  })
