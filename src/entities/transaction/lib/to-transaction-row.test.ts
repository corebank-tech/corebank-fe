import { describe, expect, it } from "vitest"
import { toTransactionRow } from "@/entities/transaction/lib/to-transaction-row"

describe("toTransactionRow", () => {
  it("거래유형과 거래채널을 화면 표시값으로 변환한다", () => {
    const row = toTransactionRow(
      {
        ledgerEntryId: 1,
        transactionNumber: "20260822WB0000000001",
        occurredAt: "2026-08-22T13:24:35",
        transactionType: "AUTO_TRANSFER",
        withdrawalAmount: 10000,
        depositAmount: 0,
        transactionContent: "관리비",
        balanceAfter: 990000,
        channel: "WB",
      },
      0,
    )

    expect(row).toMatchObject({
      id: "1",
      date: "2026-08-22",
      time: "13:24:35",
      description: "자동이체",
      channel: "인터넷뱅킹",
    })
  })

  it("지원하지 않는 거래유형과 채널은 '-'로 표시한다", () => {
    const row = toTransactionRow(
      {
        transactionType: "UNKNOWN_TYPE",
        channel: "UNKNOWN" as never,
      },
      0,
    )

    expect(row.description).toBe("-")
    expect(row.channel).toBe("-")
  })

  it("occurredAt이 없으면 날짜와 시간을 빈 문자열로 반환한다", () => {
    const row = toTransactionRow({}, 0)

    expect(row.date).toBe("")
    expect(row.time).toBe("")
  })

  it("occurredAt에 T가 없으면 전체 값을 날짜로 사용한다", () => {
    const row = toTransactionRow(
      {
        occurredAt: "2026-08-22",
      },
      0,
    )

    expect(row.date).toBe("2026-08-22")
    expect(row.time).toBe("")
  })

  it("ledgerEntryId와 transactionNumber가 없어도 fallback id가 중복되지 않는다", () => {
    const item = {
      occurredAt: "2026-08-22T13:24:35",
      balanceAfter: 1000,
    }

    const first = toTransactionRow(item, 0)
    const second = toTransactionRow(item, 1)

    expect(first.id).not.toBe(second.id)
  })
})
