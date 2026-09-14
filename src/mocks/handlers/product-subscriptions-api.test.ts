import { describe, expect, it } from "vitest"
import {
  ACCOUNT_PREFIX_BY_PRODUCT_ID,
  calculateMaturity,
  maskAccountNumber,
} from "@/mocks/handlers/product-subscriptions-api"
import { MOCK_PRODUCTS } from "@/mocks/handlers/products-api"

describe("calculateMaturity — 서버 SubscriptionMaturityCalculator 이식", () => {
  it("정기예금은 거치식 단리다", () => {
    expect(calculateMaturity("DEPOSIT", 1_000_000, 12, 3.35)).toEqual({
      expectedPrincipal: 1_000_000,
      expectedInterest: 33_500,
      expectedMaturityAmount: 1_033_500,
    })
  })

  it("이자는 원 단위 절사다", () => {
    // 1,234,567 × 3.35% × 12/12 = 41,357.99… → 41,357
    expect(
      calculateMaturity("DEPOSIT", 1_234_567, 12, 3.35).expectedInterest,
    ).toBe(41_357)
  })

  it("정기적금은 월 적립식이라 가중 개월수 n(n+1)/2 를 쓴다", () => {
    // 100,000 × 3.5% × 78/12 = 22,750
    expect(calculateMaturity("SAVINGS", 100_000, 12, 3.5)).toEqual({
      expectedPrincipal: 1_200_000,
      expectedInterest: 22_750,
      expectedMaturityAmount: 1_222_750,
    })
  })

  it("금리의 부동소수 오차에 흔들리지 않는다", () => {
    // 부동소수로 120,000 × 3.35 / 100 / 12 를 하면 334.99999… 가 되어 절사 후 334 원이다.
    expect(
      calculateMaturity("DEPOSIT", 120_000, 1, 3.35).expectedInterest,
    ).toBe(335)
  })
})

describe("maskAccountNumber — 서버 MaskingUtil 이식", () => {
  it("12자리 중 앞 3자리와 끝 3자리만 남긴다", () => {
    expect(maskAccountNumber("088210000001")).toBe("088******001")
  })
})

describe("신규 계좌번호 접두", () => {
  it.each(MOCK_PRODUCTS.map((p) => [p.productName, p.productId ?? 0] as const))(
    "목 상품 %s 에 2자리 접두가 있다",
    (_, productId) => {
      // 접두가 없으면 가입 실행이 "088undefined0000001" 같은 계좌번호를 만든다.
      expect(ACCOUNT_PREFIX_BY_PRODUCT_ID[productId]).toMatch(/^\d{2}$/)
    },
  )
})
