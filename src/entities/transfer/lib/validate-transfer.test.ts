import { describe, expect, it } from "vitest"
import { checkAmountLimit } from "@/entities/transfer/lib/validate-transfer"

const PER_TRANSFER = 5_000_000
const DAILY_REMAINING = 3_000_000

describe("checkAmountLimit", () => {
  describe("즉시이체 — 1회·1일 한도를 함께 본다", () => {
    const check = (amount: number | null) =>
      checkAmountLimit(amount, PER_TRANSFER, DAILY_REMAINING, true)

    it("둘 중 작은 값이 한도다", () => {
      expect(check(null).limit).toBe(DAILY_REMAINING)
    })

    it("한도와 같은 금액은 초과가 아니다", () => {
      expect(check(DAILY_REMAINING).overLimit).toBe(false)
    })

    it("한도보다 1원 많으면 초과다", () => {
      expect(check(DAILY_REMAINING + 1).overLimit).toBe(true)
    })

    it("1일 잔여만 넘고 1회 한도는 안 넘으면 문구를 1일 기준으로 가른다", () => {
      const result = check(DAILY_REMAINING + 1)
      expect(result.overLimit).toBe(true)
      expect(result.overPerTransferLimit).toBe(false)
    })

    it("1회 한도까지 넘으면 두 판정이 모두 선다", () => {
      const result = check(PER_TRANSFER + 1)
      expect(result.overLimit).toBe(true)
      expect(result.overPerTransferLimit).toBe(true)
    })

    it("금액을 아직 입력하지 않았으면 초과가 아니다", () => {
      expect(check(null).overLimit).toBe(false)
      expect(check(null).overPerTransferLimit).toBe(false)
    })
  })

  describe("예약·자동이체 — 등록 시점에는 1회 한도만 본다", () => {
    // REQ-RSV-006 · REQ-AUTO-006: 1일 한도는 실행 시점에 서버가 검증한다.
    const check = (amount: number | null) =>
      checkAmountLimit(amount, PER_TRANSFER, DAILY_REMAINING, false)

    it("1일 잔여가 더 작아도 1회 한도가 기준이다", () => {
      expect(check(null).limit).toBe(PER_TRANSFER)
    })

    it("1일 잔여를 넘어도 1회 한도 안이면 초과가 아니다", () => {
      expect(check(DAILY_REMAINING + 1).overLimit).toBe(false)
    })
  })
})
