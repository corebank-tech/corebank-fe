import { describe, it, expect } from "vitest"
import { checkPeriodRange } from "@/entities/transaction"

const TODAY = "2026-08-21"
const MAX = 365
const OK = { incomplete: false, reversed: false, overLimit: false }

describe("checkPeriodRange", () => {
  it("최근 1개월 창은 통과한다", () => {
    expect(checkPeriodRange("2026-07-21", TODAY, TODAY, MAX)).toEqual(OK)
  })

  it("종료일이 시작일보다 빠르면 reversed다", () => {
    expect(checkPeriodRange(TODAY, "2026-07-21", TODAY, MAX).reversed).toBe(
      true,
    )
  })

  describe("한도는 시작일과 기간 폭을 함께 본다", () => {
    it("폭은 1년 이내지만 시작일이 오래되면 걸린다", () => {
      // 폭 364일. 시작일 기준(POL-021 적용기준 열)으로만 잡힌다.
      expect(
        checkPeriodRange("2019-01-01", "2019-12-31", TODAY, MAX).overLimit,
      ).toBe(true)
    })

    it("시작일은 한도 안이지만 폭이 1년을 넘으면 걸린다", () => {
      // 종료일 스테퍼로 미래를 벌린 창. REQ-INQR-010 인수기준의 "1년 초과 기간"이다.
      expect(
        checkPeriodRange("2026-08-01", "2028-08-01", TODAY, MAX).overLimit,
      ).toBe(true)
    })

    it("시작일 경계 — 정확히 365일 전은 통과하고 하루 더 과거면 걸린다", () => {
      expect(checkPeriodRange("2025-08-21", TODAY, TODAY, MAX).overLimit).toBe(
        false,
      )
      expect(checkPeriodRange("2025-08-20", TODAY, TODAY, MAX).overLimit).toBe(
        true,
      )
    })

    it("폭 경계 — 정확히 365일 폭은 통과하고 하루 더 넓으면 걸린다", () => {
      expect(checkPeriodRange(TODAY, "2027-08-21", TODAY, MAX).overLimit).toBe(
        false,
      )
      expect(checkPeriodRange(TODAY, "2027-08-22", TODAY, MAX).overLimit).toBe(
        true,
      )
    })
  })

  it("종료일이 미래여도 시작일과 폭이 한도 안이면 통과한다 (E-04 예약이체 조회)", () => {
    expect(checkPeriodRange("2026-06-21", "2026-10-21", TODAY, MAX)).toEqual(OK)
  })

  describe("빈 입력", () => {
    it("시작일 또는 종료일이 비면 incomplete다", () => {
      expect(checkPeriodRange("", TODAY, TODAY, MAX).incomplete).toBe(true)
      expect(checkPeriodRange(TODAY, "", TODAY, MAX).incomplete).toBe(true)
    })

    it("빈 입력을 reversed·overLimit으로 흘려보내지 않는다", () => {
      // daysBetween이 NaN을 내고 NaN 비교는 전부 false라, 구분하지 않으면
      // 두 검사를 그대로 통과해 조용히 빈 목록이 된다.
      expect(checkPeriodRange("", "", TODAY, MAX)).toEqual({
        incomplete: true,
        reversed: false,
        overLimit: false,
      })
    })
  })
})
