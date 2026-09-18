import {
  GL_ACCOUNTS,
  type GlAccount,
  type GlAccountClass,
  type GlJournalEntry,
  type GlNormalBalance,
} from "@/entities/gl/api/ph28-trial-balance"

/** 시산표 한 행 = 기간 안에서 그 계정이 받은 차변·대변 합계. */
export type TrialBalanceRow = {
  accountCode: string
  accountName: string
  /**
   * 계정과목에 등록되지 않은 코드면 `null` 이다.
   *
   * **`GlAccountClass` 에 "UNKNOWN" 을 더하지 않는다.** 그 타입은 서버에 넘길 계약이고
   * 미등록은 서버가 가질 상태가 아니라 화면이 해석하지 못한 상태다. 계약 enum 에 섞으면
   * BE 가 없는 분류를 만들게 된다. 값이 없다는 사실은 `null` 로 말한다.
   */
  accountClass: GlAccountClass | null
  normalBalance: GlNormalBalance | null
  debitTotal: number
  creditTotal: number
  /** 이 계정에 걸린 분개 줄 수. 합계가 이상할 때 어디를 볼지 알려준다. */
  entryCount: number
}

export type TrialBalanceResult = {
  fromDate: string
  toDate: string
  rows: TrialBalanceRow[]
  debitGrandTotal: number
  creditGrandTotal: number
  /** 차변 총계 − 대변 총계. 0 이 아니면 장부가 틀렸다. */
  difference: number
  balanced: boolean
  journalEntryCount: number
}

export type TrialBalancePeriod = { start: string; end: string }

/**
 * 계정과목에 없는 코드가 분개에 섞였을 때 쓰는 이름.
 *
 * 그냥 건너뛰면 그 줄의 금액이 총계에서 빠지면서 **차대변이 맞는 것처럼 보인다** —
 * 시산표가 숨겨야 할 것을 숨긴다. 이름을 모르는 채로 행을 남겨야 합계가 어긋나고
 * 화면이 불일치를 드러낸다. 이 화면의 존재 이유가 "틀렸을 때 잡아낸다"이므로
 * 조용한 폴백을 두지 않는다.
 */
export const UNKNOWN_ACCOUNT_NAME = "(계정과목 미등록)"

/**
 * 기간 안의 분개를 계정별로 합산해 시산표를 만든다.
 *
 * 화면이 아니라 여기 두는 이유는 **차대변 불일치 분기를 테스트할 수 있어야** 해서다.
 * 정상 데이터로는 그 분기가 한 번도 실행되지 않는데, 불일치야말로 이 화면이 존재하는
 * 이유(PH-28b 결함 주입 탐지)다. 관리자 네비 권한 필터를 화면 안에 인라인으로 뒀다가
 * 거르는 분기가 통째로 죽어 있던 전례가 있다(`widgets/admin-shell/visible-nav.ts`).
 *
 * 기간 경계는 양끝 포함이다. 거래일자는 `yyyy-MM-dd` 고정 폭이라 문자열 비교로 족하다.
 */
export const aggregateTrialBalance = (
  entries: GlJournalEntry[],
  period: TrialBalancePeriod,
  accounts: GlAccount[] = GL_ACCOUNTS,
): TrialBalanceResult => {
  const inPeriod = entries.filter(
    (entry) => entry.tradeDate >= period.start && entry.tradeDate <= period.end,
  )

  const byCode = new Map<string, TrialBalanceRow>()
  for (const entry of inPeriod) {
    const existing = byCode.get(entry.accountCode)
    if (existing) {
      existing.debitTotal += entry.debit
      existing.creditTotal += entry.creditAmount
      existing.entryCount += 1
      continue
    }
    const account = accounts.find((a) => a.code === entry.accountCode)
    byCode.set(entry.accountCode, {
      accountCode: entry.accountCode,
      accountName: account?.name ?? UNKNOWN_ACCOUNT_NAME,
      // 미등록 계정의 분류·정상잔액을 **지어내지 않는다.** 코드 첫 자리로 분류를
      // 추측했더니 `99999` 가 "자산"으로 찍혔다 — 이름은 미등록이라 빨갛게 드러내면서
      // 바로 옆 배지는 멀쩡한 계정처럼 보이는 상태였다. 모르는 것은 모른다고 둔다.
      accountClass: account?.accountClass ?? null,
      normalBalance: account?.normalBalance ?? null,
      debitTotal: entry.debit,
      creditTotal: entry.creditAmount,
      entryCount: 1,
    })
  }

  // 움직임이 없는 계정은 행으로 두지 않는다. 시산표는 계정과목 목록이 아니라
  // 기간 안의 증감을 보는 표다 — 0 행이 늘면 틀린 계정을 찾기만 어려워진다.
  const rows = [...byCode.values()].sort((a, b) =>
    a.accountCode.localeCompare(b.accountCode),
  )

  const debitGrandTotal = rows.reduce((sum, row) => sum + row.debitTotal, 0)
  const creditGrandTotal = rows.reduce((sum, row) => sum + row.creditTotal, 0)

  return {
    fromDate: period.start,
    toDate: period.end,
    rows,
    debitGrandTotal,
    creditGrandTotal,
    difference: debitGrandTotal - creditGrandTotal,
    balanced: debitGrandTotal === creditGrandTotal,
    journalEntryCount: inPeriod.length,
  }
}
