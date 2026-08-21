import { describe, expect, it, vi } from "vitest"
import {
  toAutoTransferRow,
  toAutoTransferResultRow,
} from "@/entities/transfer/lib/mappers"
import type {
  AutoTransferExecutionHistoryItemResponse,
  AutoTransferListItemResponse,
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
  cancelable: true,
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
      cancelable: true,
    })
  })

  // 해지 가능 여부가 빠진 응답을 '가능'으로 읽으면 해지할 수 없는 건에 해지 버튼이
  // 열린다. 서버 거부로 끝나긴 하지만 사용자는 인증까지 끝낸 뒤에야 알게 된다.
  it("해지 가능 여부가 없으면 해지 불가로 읽는다", () => {
    const row = toAutoTransferRow(
      { ...BASE_ITEM, cancelable: undefined },
      FROM_ACCOUNT_NO,
    )
    expect(row.cancelable).toBe(false)
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

const FROM_ACCOUNT = { accountNo: FROM_ACCOUNT_NO, alias: "자유입출금" }

const BASE_EXECUTION: AutoTransferExecutionHistoryItemResponse = {
  executionId: 7,
  status: "SUCCESS",
  executedAt: "2026-07-21T00:10:00",
  withdrawalAccountId: 1,
  depositAccountNumber: "110550098213",
  payeeName: "박지훈",
  amount: 187_400,
  cycleMonths: 1,
  myPassbookMemo: "관리비",
  failureReason: null,
}

describe("toAutoTransferResultRow", () => {
  it("응답 필드를 화면 표시용 타입으로 옮긴다", () => {
    const row = toAutoTransferResultRow(BASE_EXECUTION, FROM_ACCOUNT)

    expect(row).toEqual({
      id: "7",
      result: "정상",
      processedAt: "2026-07-21T00:10:00",
      fromAccountNo: FROM_ACCOUNT_NO,
      fromAlias: "자유입출금",
      toAccountNo: "110550098213",
      payeeName: "박지훈",
      amount: 187_400,
      cycleMonths: 1,
      memo: "관리비",
      failReason: undefined,
    })
  })

  it("출금계좌 정보는 응답이 아니라 인자로 받은 값을 쓴다", () => {
    const row = toAutoTransferResultRow(BASE_EXECUTION, {
      accountNo: "302998112233",
      alias: "급여통장",
    })
    expect(row.fromAccountNo).toBe("302998112233")
    expect(row.fromAlias).toBe("급여통장")
  })

  it.each([
    ["SUCCESS", "정상"],
    ["ERROR", "오류"],
    ["PROCESSING", "처리중"],
  ])("실행결과 %s를 %s로 옮긴다", (apiStatus, expected) => {
    const row = toAutoTransferResultRow(
      {
        ...BASE_EXECUTION,
        status: apiStatus as AutoTransferExecutionHistoryItemResponse["status"],
      },
      FROM_ACCOUNT,
    )
    expect(row.result).toBe(expected)
  })

  it("실패 사유를 그대로 싣는다", () => {
    const row = toAutoTransferResultRow(
      {
        ...BASE_EXECUTION,
        status: "ERROR",
        failureReason: "출금계좌 잔액 부족",
      },
      FROM_ACCOUNT,
    )
    expect(row.result).toBe("오류")
    expect(row.failReason).toBe("출금계좌 잔액 부족")
  })

  it("모르는 실행결과는 콘솔에 남기고 '처리중'으로 폴백한다", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    const row = toAutoTransferResultRow(
      {
        ...BASE_EXECUTION,
        status:
          "RETRYING" as AutoTransferExecutionHistoryItemResponse["status"],
      },
      FROM_ACCOUNT,
    )

    // 정상·오류 중 하나로 폴백하면 확정되지 않은 회차를 확정된 것처럼 보여준다.
    expect(row.result).toBe("처리중")
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })

  it("failureReason이 null이면 undefined로 둔다", () => {
    const row = toAutoTransferResultRow(
      { ...BASE_EXECUTION, failureReason: null },
      FROM_ACCOUNT,
    )
    expect(row.failReason).toBeUndefined()
  })
})
