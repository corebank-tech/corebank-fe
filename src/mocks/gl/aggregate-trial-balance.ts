import type { Row, TrialBalanceResponse } from "@/shared/api/generated"
import {
  GL_ACCOUNTS,
  type GlAccount,
  type GlJournalEntry,
} from "@/mocks/gl/journal-entries"

/**
 * 시산표 응답의 한 행. 계약 타입(`Row`)에서 선택 표시만 벗겨 낸 것이다 — 목은 모든
 * 필드를 채우므로, 테스트가 `?.` 없이 값을 읽게 한다.
 *
 * 미등록 계정은 `accountName`·`accountClass`·`normalBalance` 가 `null` 이다. 서버
 * 계약이 그렇다("계정과목에 없는 코드면 null").
 */
export type MockTrialBalanceRow = Required<Row>

export type MockTrialBalance = Required<Omit<TrialBalanceResponse, "rows">> & {
  rows: MockTrialBalanceRow[]
}

export type TrialBalancePeriod = { start: string; end: string }

/**
 * 분개 한 줄을 차변·대변 두 칸으로 편다.
 *
 * **판정을 한 곳에만 둔다.** 처음 보는 계정과 이미 본 계정은 따로 처리하지만 방향
 * 판정은 공유한다. 두 벌로 두면 한쪽이 모르는 값을 버리게 되기 쉬운데, 버리면 그
 * 금액이 총계에서 빠지면서 차대변이 맞는 것처럼 보인다 — 미등록 계정을 버리지 않는
 * 이유(REQ-ADM-024)와 같다.
 */
const splitByDirection = (entry: GlJournalEntry) =>
  entry.drCr === "DEBIT"
    ? { debitTotal: entry.amount, creditTotal: 0 }
    : { debitTotal: 0, creditTotal: entry.amount }

/**
 * 기간 안의 분개를 계정별로 합산해 시산표 응답을 만든다 — MSW 가 서버 PH-28
 * (`GET /admin/trial-balance`, 네이티브 SQL 집계) 대신 하는 일이다.
 *
 * 집계된 표를 목으로 두지 않고 분개에서 매번 합산하는 이유는 **조회기간이 실제로
 * 무언가를 거르는 것을 화면에서 보기 위해서**다. 미리 합산한 표를 돌려주면 기간을
 * 바꿔도 같은 숫자가 나와, e2e 가 기간 조건을 검증할 수 없다.
 *
 * 차대변 불일치 분기는 정상 목 데이터로는 실행되지 않아 단위 테스트가 지킨다
 * (`aggregate-trial-balance.test.ts`).
 *
 * 기간 경계는 양끝 포함이다. 거래일자는 `yyyy-MM-dd` 고정 폭이라 문자열 비교로 족하다.
 */
export const aggregateTrialBalance = (
  entries: GlJournalEntry[],
  period: TrialBalancePeriod,
  accounts: GlAccount[] = GL_ACCOUNTS,
): MockTrialBalance => {
  const inPeriod = entries.filter(
    (entry) => entry.tradeDate >= period.start && entry.tradeDate <= period.end,
  )

  const byCode = new Map<string, MockTrialBalanceRow>()
  for (const entry of inPeriod) {
    const { debitTotal, creditTotal } = splitByDirection(entry)
    const existing = byCode.get(entry.accountCode)
    if (existing) {
      existing.debitTotal += debitTotal
      existing.creditTotal += creditTotal
      existing.entryCount += 1
      continue
    }
    const account = accounts.find((a) => a.code === entry.accountCode)
    byCode.set(entry.accountCode, {
      accountCode: entry.accountCode,
      accountName: account?.name ?? null,
      // 미등록 계정의 분류·정상잔액을 **지어내지 않는다.** 코드 첫 자리로 분류를
      // 추측했더니 `99999` 가 "자산"으로 찍혔다 — 이름은 미등록이라 빨갛게 드러내면서
      // 바로 옆 배지는 멀쩡한 계정처럼 보이는 상태였다. 모르는 것은 모른다고 둔다.
      accountClass: account?.accountClass ?? null,
      normalBalance: account?.normalBalance ?? null,
      debitTotal,
      creditTotal,
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
