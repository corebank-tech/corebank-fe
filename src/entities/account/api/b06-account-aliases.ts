/**
 * B-06 계좌별명 관리 목업 데이터. REQ-ACCT-013.
 * 별명이 없으면(alias=null) 목록·이체 등 전 화면에 productName(상품명)이 표시된다.
 */

import type { AccountGroupId } from "@/entities/account/api/b01-accounts"

export type AliasAccount = {
  id: string
  group: AccountGroupId
  accountNo: string
  /** 별명이 없을 때 표시되는 상품명 */
  productName: string
  alias: string | null
}

export const MOCK_ALIAS_ACCOUNTS: AliasAccount[] = [
  {
    id: "al1",
    group: "checking",
    accountNo: "110632892336",
    productName: "자유입출금통장",
    alias: "생활비통장",
  },
  {
    id: "al2",
    group: "checking",
    accountNo: "302998112233",
    productName: "급여통장",
    alias: null,
  },
  {
    id: "al3",
    group: "checking",
    accountNo: "255104778910",
    productName: "자유입출금통장",
    alias: "비상금",
  },
  {
    id: "al4",
    group: "deposit",
    accountNo: "110550051877",
    productName: "정기예금 1년",
    alias: null,
  },
  {
    id: "al5",
    group: "deposit",
    accountNo: "110220093412",
    productName: "내집마련적금",
    alias: "내집마련적금",
  },
  {
    id: "al6",
    group: "deposit",
    accountNo: "110770164529",
    productName: "여행적금",
    alias: null,
  },
]

export const ALIAS_KOREAN_MAX = 12
export const ALIAS_ALNUM_MAX = 24

/** REQ-ACCT-013: 별명은 한글 12자 / 영문·숫자 24자 이내. */
export function isAliasLengthValid(value: string): boolean {
  const isAlnumOnly = /^[A-Za-z0-9]*$/.test(value)
  return isAlnumOnly
    ? value.length <= ALIAS_ALNUM_MAX
    : value.length <= ALIAS_KOREAN_MAX
}
