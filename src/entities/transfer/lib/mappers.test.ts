import { describe, expect, it, vi } from "vitest"
import {
  toAutoTransferRow,
  toReservationRow,
} from "@/entities/transfer/lib/mappers"
import type {
  AutoTransferListItemResponse,
  ScheduledTransferListItemResponse,
} from "@/shared/api/generated/model"

const FROM_ACCOUNT_NO = "110632892336"

const BASE_ITEM: AutoTransferListItemResponse = {
  autoTransferId: 12,
  depositAccountNumber: "110220093412",
  fromAlias: "자유입출금",
  payeeName: "홍길동",
  amount: 500_000,
  startDate: "2025-09-05",
  endDate: "2027-08-05",
  transferDay: 5,
  cycleMonths: 1,
  myPassbookMemo: "내집마련적금",
  status: "NORMAL",
  registeredAt: "2025-09-01T10:00:00",
}

describe("toAutoTransferRow", () => {
  it("응답 필드를 화면 표시용 타입으로 옮긴다", () => {
    const row = toAutoTransferRow(BASE_ITEM, FROM_ACCOUNT_NO)

    expect(row).toEqual({
      id: "12",
      fromAccountNo: FROM_ACCOUNT_NO,
      fromAlias: "자유입출금",
      toAccountNo: "110220093412",
      payeeName: "홍길동",
      amount: 500_000,
      cycleMonths: 1,
      dayOfMonth: 5,
      startDate: "2025-09-05",
      endDate: "2027-08-05",
      memo: "내집마련적금",
      status: "정상",
    })
  })

  it("출금계좌번호는 응답이 아니라 인자로 받은 값을 쓴다", () => {
    const row = toAutoTransferRow(BASE_ITEM, "302998112233")
    expect(row.fromAccountNo).toBe("302998112233")
  })

  it.each([
    ["NORMAL", "정상"],
    ["EXPIRED", "종료"],
    ["TERMINATED", "해지"],
  ])("상태 %s를 %s로 옮긴다", (apiStatus, expected) => {
    const row = toAutoTransferRow(
      {
        ...BASE_ITEM,
        status: apiStatus as AutoTransferListItemResponse["status"],
      },
      FROM_ACCOUNT_NO,
    )
    expect(row.status).toBe(expected)
  })

  it("모르는 상태는 콘솔에 남기고 '종료'로 폴백한다", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    const row = toAutoTransferRow(
      {
        ...BASE_ITEM,
        status: "SUSPENDED" as AutoTransferListItemResponse["status"],
      },
      FROM_ACCOUNT_NO,
    )

    // '정상'으로 폴백하면 상태를 모르는 건에 변경·해지 버튼이 열린다.
    expect(row.status).toBe("종료")
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })

  it("status가 없어도 폴백한다", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    const row = toAutoTransferRow(
      { ...BASE_ITEM, status: undefined },
      FROM_ACCOUNT_NO,
    )

    expect(row.status).toBe("종료")
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })

  it.each([1, 3, 6])("이체주기 %d개월을 그대로 쓴다", (cycleMonths) => {
    const row = toAutoTransferRow(
      { ...BASE_ITEM, cycleMonths },
      FROM_ACCOUNT_NO,
    )
    expect(row.cycleMonths).toBe(cycleMonths)
  })

  it("3종이 아닌 이체주기는 콘솔에 남기고 1개월로 폴백한다", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    const row = toAutoTransferRow(
      { ...BASE_ITEM, cycleMonths: 2 },
      FROM_ACCOUNT_NO,
    )

    expect(row.cycleMonths).toBe(1)
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })

  it("nextExecDate는 응답에 없어 비어 있다", () => {
    const row = toAutoTransferRow(BASE_ITEM, FROM_ACCOUNT_NO)
    expect(row.nextExecDate).toBeUndefined()
  })

  it("선택 필드가 비어 있어도 빈 값으로 채운다", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    const row = toAutoTransferRow({}, FROM_ACCOUNT_NO)

    expect(row).toMatchObject({
      id: "",
      fromAlias: "",
      toAccountNo: "",
      payeeName: "",
      amount: 0,
      dayOfMonth: 1,
      startDate: "",
      endDate: "",
      memo: "",
    })
    spy.mockRestore()
  })
})

const RESERVATION_ITEM: ScheduledTransferListItemResponse = {
  scheduledTransferId: 7,
  status: "WAITING",
  scheduledDate: "2026-08-24",
  withdrawalAccountNumber: "110******877",
  accountNumber: "333******135",
  payeeName: "김*수",
  amount: 300_000,
  cancelable: true,
}

describe("toReservationRow", () => {
  it("서버가 마스킹해서 내려준 계좌번호·예금주명을 다시 가공하지 않고 그대로 옮긴다(#47)", () => {
    const row = toReservationRow(RESERVATION_ITEM)

    expect(row.fromAccountNo).toBe("110******877")
    expect(row.toAccountNo).toBe("333******135")
    expect(row.payeeName).toBe("김*수")
  })

  it("PROCESSING 상태는 대기로 옮긴다", () => {
    const row = toReservationRow({
      ...RESERVATION_ITEM,
      status: "PROCESSING",
    })
    expect(row.status).toBe("대기")
  })
})
