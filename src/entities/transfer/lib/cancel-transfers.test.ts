import { describe, expect, it } from "vitest"
import {
  getCancelFailureMessage,
  toAutoTransferCancelRequest,
  toScheduledTransferCancelRequest,
} from "@/entities/transfer/lib/cancel-transfers"

const FALLBACK = "자동이체 해지에 실패했습니다."

describe("toAutoTransferCancelRequest · toScheduledTransferCancelRequest", () => {
  // 서버가 정렬·중복 제거한 배열로 OTP 거래정보를 대조한다. 순서가 다르면 OTP0102.
  it("행 ID를 숫자로 바꿔 오름차순 정렬·중복 제거한다", () => {
    expect(toAutoTransferCancelRequest(["12", "3", "12"])).toEqual({
      autoTransferIds: [3, 12],
    })
    expect(toScheduledTransferCancelRequest(["12", "3", "12"])).toEqual({
      scheduledTransferIds: [3, 12],
    })
  })

  it("키 이름이 서버 OTP 거래정보와 같다 — transactionData 는 타입이 잡아주지 않는다", () => {
    expect(Object.keys(toAutoTransferCancelRequest(["1"]))).toEqual([
      "autoTransferIds",
    ])
    expect(Object.keys(toScheduledTransferCancelRequest(["1"]))).toEqual([
      "scheduledTransferIds",
    ])
  })
})

describe("getCancelFailureMessage", () => {
  it("전 건 SUCCESS 면 실패가 없다", () => {
    expect(
      getCancelFailureMessage(
        [{ autoTransferId: 1, status: "SUCCESS" }],
        1,
        FALLBACK,
      ),
    ).toBeNull()
  })

  // 해지 불가는 예외가 아니라 200 응답의 건별 ERROR 로 온다.
  it("200 응답이어도 ERROR 건이 있으면 서버 실패 사유를 돌려준다", () => {
    expect(
      getCancelFailureMessage(
        [
          {
            autoTransferId: 1,
            status: "ERROR",
            failureCode: "AUT0303",
            failureReason: "다음 실행 예정일 당일에는 해지할 수 없습니다.",
          },
        ],
        1,
        FALLBACK,
      ),
    ).toBe("다음 실행 예정일 당일에는 해지할 수 없습니다.")
  })

  it("실패 사유가 비어 있으면 기본 문구로 알린다", () => {
    expect(
      getCancelFailureMessage(
        [{ scheduledTransferId: 1, status: "ERROR", failureReason: null }],
        1,
        FALLBACK,
      ),
    ).toBe(FALLBACK)
  })

  it("PROCESSING 은 반영을 확정할 수 없으므로 실패로 본다", () => {
    expect(
      getCancelFailureMessage(
        [{ autoTransferId: 1, status: "PROCESSING" }],
        1,
        FALLBACK,
      ),
    ).toBe(FALLBACK)
  })

  it("status 가 빠진 결과도 성공으로 치지 않는다", () => {
    expect(getCancelFailureMessage([{ autoTransferId: 1 }], 1, FALLBACK)).toBe(
      FALLBACK,
    )
  })

  it("요청한 건수보다 결과가 적으면 실패로 본다", () => {
    expect(getCancelFailureMessage(undefined, 1, FALLBACK)).toBe(FALLBACK)
    expect(getCancelFailureMessage([], 1, FALLBACK)).toBe(FALLBACK)
  })
})
