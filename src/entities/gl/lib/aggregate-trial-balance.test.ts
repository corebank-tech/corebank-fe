import { describe, expect, it } from "vitest"
import {
  GL_ACCOUNTS,
  MOCK_JOURNAL_ENTRIES,
  type GlJournalEntry,
} from "@/entities/gl/api/ph28-trial-balance"
import {
  aggregateTrialBalance,
  UNKNOWN_ACCOUNT_NAME,
} from "@/entities/gl/lib/aggregate-trial-balance"

const WIDE = { start: "2000-01-01", end: "2999-12-31" }

const line = (
  tradeDate: string,
  accountCode: string,
  debit: number,
  credit: number,
): GlJournalEntry => ({
  voucherNo: "T-0001",
  tradeDate,
  txType: "TRANSFER",
  accountCode,
  debitAmount: debit,
  creditAmount: credit,
})

describe("aggregateTrialBalance", () => {
  it("기간 밖 분개를 빼고 집계한다", () => {
    const entries = [
      line("2026-01-10", "10100", 100, 0),
      line("2026-01-10", "20100", 0, 100),
      line("2026-03-10", "10100", 500, 0),
      line("2026-03-10", "20100", 0, 500),
    ]

    const result = aggregateTrialBalance(entries, {
      start: "2026-01-01",
      end: "2026-01-31",
    })

    expect(result.journalEntryCount).toBe(2)
    expect(result.debitGrandTotal).toBe(100)
  })

  it("기간 경계일의 분개를 포함한다", () => {
    const entries = [line("2026-01-31", "10100", 100, 0)]

    const result = aggregateTrialBalance(entries, {
      start: "2026-01-01",
      end: "2026-01-31",
    })

    expect(result.journalEntryCount).toBe(1)
  })

  it("같은 계정의 차변·대변을 각각 누적한다", () => {
    // 당행 이체는 예수금이 양변에 서므로, 한쪽으로 상계하면 거래가 사라진다.
    const entries = [
      line("2026-01-10", "20100", 1000, 0),
      line("2026-01-10", "20100", 0, 1000),
    ]

    const [row] = aggregateTrialBalance(entries, WIDE).rows

    expect(row.debitTotal).toBe(1000)
    expect(row.creditTotal).toBe(1000)
    expect(row.entryCount).toBe(2)
  })

  it("움직임이 없는 계정은 행으로 두지 않는다", () => {
    const entries = [
      line("2026-01-10", "10100", 100, 0),
      line("2026-01-10", "20100", 0, 100),
    ]

    const codes = aggregateTrialBalance(entries, WIDE).rows.map(
      (row) => row.accountCode,
    )

    expect(codes).toEqual(["10100", "20100"])
  })

  it("계정과목 이름·분류·정상잔액 방향을 붙인다", () => {
    const [row] = aggregateTrialBalance(
      [line("2026-01-10", "20100", 0, 100)],
      WIDE,
    ).rows

    expect(row.accountName).toBe("예수금")
    expect(row.accountClass).toBe("LIABILITY")
    expect(row.normalBalance).toBe("CREDIT")
  })

  it("차대변이 맞으면 balanced 가 참이고 차액이 0 이다", () => {
    const result = aggregateTrialBalance(MOCK_JOURNAL_ENTRIES, WIDE)

    expect(result.balanced).toBe(true)
    expect(result.difference).toBe(0)
  })

  it("어떤 기간으로 잘라도 차대변이 맞는다", () => {
    // 전표는 거래일자가 하나라 기간으로 잘려도 통째로 들어오거나 통째로 빠진다.
    // 이 성질이 깨지면 화면이 정상 데이터에서도 불일치를 띄운다.
    for (const days of [1, 7, 30, 90, 365]) {
      const result = aggregateTrialBalance(MOCK_JOURNAL_ENTRIES, {
        start: "2000-01-01",
        end: new Date(Date.now() - days * 86_400_000)
          .toISOString()
          .slice(0, 10),
      })

      expect(result.balanced).toBe(true)
    }
  })

  it("편측기표가 섞이면 불일치를 드러낸다", () => {
    // PH-28b 결함 주입 4종 중 하나. 대변 줄이 통째로 빠진 상태다.
    const entries = [
      line("2026-01-10", "10100", 100, 0),
      line("2026-01-10", "20100", 0, 100),
      line("2026-01-11", "10100", 70, 0),
    ]

    const result = aggregateTrialBalance(entries, WIDE)

    expect(result.balanced).toBe(false)
    expect(result.difference).toBe(70)
  })

  it("금액변조가 섞이면 차액이 변조분과 같다", () => {
    const entries = [
      line("2026-01-10", "10100", 130, 0),
      line("2026-01-10", "20100", 0, 100),
    ]

    const result = aggregateTrialBalance(entries, WIDE)

    expect(result.difference).toBe(30)
  })

  it("계정과목에 없는 코드를 버리지 않고 드러낸다", () => {
    // 조용히 건너뛰면 그 줄의 금액이 총계에서 빠져 차대변이 맞는 것처럼 보인다.
    const entries = [
      line("2026-01-10", "10100", 100, 0),
      line("2026-01-10", "99999", 0, 100),
    ]

    const result = aggregateTrialBalance(entries, WIDE)
    const unknown = result.rows.find((row) => row.accountCode === "99999")

    expect(unknown?.accountName).toBe(UNKNOWN_ACCOUNT_NAME)
    // 분류·정상잔액을 지어내지 않는다. 코드 첫 자리로 추측하면 `99999` 가 화면에서
    // "자산 / 차변"으로 찍혀 멀쩡한 계정처럼 보인다.
    expect(unknown?.accountClass).toBeNull()
    expect(unknown?.normalBalance).toBeNull()
    // 그래도 금액은 총계에 들어간다 — 빼면 차대변이 맞는 것처럼 보인다.
    expect(result.creditGrandTotal).toBe(100)
    expect(result.balanced).toBe(true)
  })

  it("목 분개는 전표 단위로 차대변이 맞는다", () => {
    // PH-21 의 핵심 규칙이고 지금까지 주석으로만 선언돼 있었다. 총계만 보는
    // 테스트는 **서로 상쇄되는 두 전표의 오류**를 통과시킨다(전표 A 차변 +N,
    // 전표 B 대변 +N) — 그게 이 화면이 잡으라고 존재하는 편측기표다.
    const byVoucher = new Map<string, { debit: number; credit: number }>()
    for (const entry of MOCK_JOURNAL_ENTRIES) {
      const sum = byVoucher.get(entry.voucherNo) ?? { debit: 0, credit: 0 }
      sum.debit += entry.debitAmount
      sum.credit += entry.creditAmount
      byVoucher.set(entry.voucherNo, sum)
    }

    for (const [voucherNo, sum] of byVoucher) {
      // 전표번호를 같이 단언해 실패 메시지가 어느 전표인지 말하게 한다.
      expect([voucherNo, sum.debit]).toEqual([voucherNo, sum.credit])
    }
  })

  it("목 분개가 쓰는 계정코드는 전부 계정과목에 있다", () => {
    // 두 상수는 서로를 import 하지 않아 한쪽만 고쳐도 아무것도 깨지지 않는다.
    // `GL_ACCOUNTS` 에서 한 줄을 지우면 기본 화면이 "(계정과목 미등록)" 행을 띄운다.
    const known = new Set(GL_ACCOUNTS.map((account) => account.code))
    const used = [
      ...new Set(MOCK_JOURNAL_ENTRIES.map((entry) => entry.accountCode)),
    ]

    expect(used.filter((code) => !known.has(code))).toEqual([])
  })

  it("계정 코드 순으로 정렬한다", () => {
    const entries = [
      line("2026-01-10", "50100", 100, 0),
      line("2026-01-10", "10100", 100, 0),
      line("2026-01-10", "20100", 0, 200),
    ]

    const codes = aggregateTrialBalance(entries, WIDE).rows.map(
      (row) => row.accountCode,
    )

    expect(codes).toEqual(["10100", "20100", "50100"])
  })
})
