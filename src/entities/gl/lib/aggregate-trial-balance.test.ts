import { describe, expect, it } from "vitest"
import {
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
  debit,
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
    expect(result.creditGrandTotal).toBe(100)
    expect(result.balanced).toBe(true)
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
