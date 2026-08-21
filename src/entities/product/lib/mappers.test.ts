import { describe, expect, it, vi } from "vitest"
import {
  toProductCard,
  toProductDetailData,
  getProductTermRange,
  getAppliedRateForTerm,
} from "@/entities/product/lib/mappers"
import type {
  ProductDetailResponse,
  ProductListItemResponse,
} from "@/shared/api/generated/model"

const BASE_DETAIL: ProductDetailResponse = {
  productId: 1,
  productName: "코어 정기예금",
  productGroup: "DEPOSIT",
  description: "설명",
  maxRate: 3.5,
  minAmount: 100_000,
  maxAmount: 500_000_000,
  termOptions: [6, 12, 24, 36],
  rateTiers: [
    { termMonths: 6, rate: 3.0 },
    { termMonths: 12, rate: 3.2 },
    { termMonths: 24, rate: 3.4 },
  ],
  preferentialRates: [
    { conditionCode: "A", conditionName: "급여이체", rate: 0.2 },
    { conditionCode: "B", conditionName: "첫거래", rate: 0.1 },
  ],
  notices: [],
}

describe("toProductDetailData (R3)", () => {
  it("우대금리 합산값을 전 구간에 동일 적용한다", () => {
    const result = toProductDetailData(BASE_DETAIL)
    // preferentialRates 합산 = 0.2 + 0.1 = 0.3
    result.rates.forEach((r) => expect(r.primeRate).toBeCloseTo(0.3))
    expect(result.rates.map((r) => Number(r.maxRate.toFixed(1)))).toEqual([
      3.3, 3.5, 3.7,
    ])
  })

  it("termOptions가 비어있으면 period를 빈 문자열로 둔다", () => {
    const result = toProductDetailData({ ...BASE_DETAIL, termOptions: [] })
    expect(result.period).toBe("")
  })

  it("rateTiers가 없으면 rates를 빈 배열로 둔다", () => {
    const result = toProductDetailData({
      ...BASE_DETAIL,
      rateTiers: undefined,
    })
    expect(result.rates).toEqual([])
  })

  it("saleStatus가 SUSPENDED면 그대로 전달한다", () => {
    const result = toProductDetailData({
      ...BASE_DETAIL,
      saleStatus: "SUSPENDED",
    })
    expect(result.saleStatus).toBe("SUSPENDED")
  })

  it("saleStatus가 없으면 판매중으로 취급한다", () => {
    const result = toProductDetailData({
      ...BASE_DETAIL,
      saleStatus: undefined,
    })
    expect(result.saleStatus).toBe("ON_SALE")
  })

  it("알 수 없는 productGroup은 콘솔에 남기고 정기예금으로 폴백한다 (R5)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const result = toProductDetailData({
      ...BASE_DETAIL,
      // @ts-expect-error 백엔드가 스펙에 없는 값을 보내는 상황을 재현한다.
      productGroup: "UNKNOWN",
    })
    expect(result.category).toBe("정기예금")
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })
})

describe("toProductCard", () => {
  it("SAVINGS는 정기적금으로 매핑한다", () => {
    const item: ProductListItemResponse = {
      productId: 2,
      productName: "코어 자유적금",
      productGroup: "SAVINGS",
      summary: "요약",
      maxRate: 4.2,
      baseRate: 3.7,
      minTermMonths: 12,
      maxTermMonths: 36,
      minAmount: 10_000,
      maxAmount: 3_000_000,
    }
    expect(toProductCard(item).category).toBe("정기적금")
  })
})

describe("getProductTermRange", () => {
  it("termOptions의 최소/최대값을 반환한다", () => {
    expect(getProductTermRange(BASE_DETAIL)).toEqual({
      minTermMonths: 6,
      maxTermMonths: 36,
    })
  })

  it("termOptions가 비어있으면 0/0을 반환한다", () => {
    expect(getProductTermRange({ ...BASE_DETAIL, termOptions: [] })).toEqual({
      minTermMonths: 0,
      maxTermMonths: 0,
    })
  })
})

describe("getAppliedRateForTerm", () => {
  it("정확히 일치하는 구간의 금리에 우대금리를 더한다", () => {
    // rateTiers[12개월] = 3.2 + preferentialRates 합산(0.3)
    expect(getAppliedRateForTerm(BASE_DETAIL, 12)).toBeCloseTo(3.5)
  })

  it("정확히 일치하는 구간이 없으면 가장 가까운 구간을 쓴다", () => {
    // 36개월 옵션은 있지만 rateTiers엔 24개월까지만 있음 -> 24개월 구간(3.4)을 참고
    expect(getAppliedRateForTerm(BASE_DETAIL, 36)).toBeCloseTo(3.7)
  })
})
