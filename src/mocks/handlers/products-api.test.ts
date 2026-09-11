import { describe, expect, it } from "vitest"
import {
  buildProductDetail,
  buildProductTermsView,
  MOCK_PRODUCTS,
} from "@/mocks/handlers/products-api"

/**
 * 목록(C-01) 카드·상세(C-02)·약관 전문(C-03)이 같은 상품을 같은 숫자로 보여주는지
 * 지킨다.
 *
 * 상세 목은 목록 목에서, 약관 전문은 상세에서 파생하지만, 파생 규칙(가입기간 후보·
 * 구간 금리 역산·전문 생성)을 누가 고치면 세 화면이 어긋날 수 있다. 이 테스트는
 * 그 편집을 잡는다.
 */
describe.each(MOCK_PRODUCTS.map((p) => [p.productName, p] as const))(
  "상품 목 %s",
  (_, product) => {
    const detail = buildProductDetail(product)
    const tiers = detail.rateTiers ?? []
    const terms = detail.termOptions ?? []
    const preferentialSum = (detail.preferentialRates ?? []).reduce(
      (sum, r) => sum + (r.rate ?? 0),
      0,
    )

    it("목록과 겹치는 값이 같다", () => {
      expect(detail.productId).toBe(product.productId)
      expect(detail.productName).toBe(product.productName)
      expect(detail.productGroup).toBe(product.productGroup)
      expect(detail.baseRate).toBe(product.baseRate)
      expect(detail.maxRate).toBe(product.maxRate)
      expect(detail.minAmount).toBe(product.minAmount)
      expect(detail.maxAmount).toBe(product.maxAmount)
    })

    it("가입기간 선택지의 양 끝이 목록의 최소·최대 가입기간과 같다", () => {
      // C-02 의 가입기간 문구는 termOptions 양 끝으로, C-01 카드는
      // min/maxTermMonths 로 그린다.
      expect(terms[0]).toBe(product.minTermMonths)
      expect(terms[terms.length - 1]).toBe(product.maxTermMonths)
    })

    it("가입기간마다 금리 구간이 하나씩 있다", () => {
      expect(tiers.map((t) => t.termMonths)).toEqual(terms)
    })

    it("최저 구간 금리가 기본금리다", () => {
      expect(tiers[0]?.rate).toBeCloseTo(product.baseRate ?? 0, 2)
    })

    it("최고 구간 금리 + 우대금리 합이 최고금리다", () => {
      // 매퍼가 우대금리를 전 구간에 합산하므로(toRateRows) C-02 금리표의
      // 최고금리 열 끝값이 이 값이 된다. C-01 카드의 최고금리와 같아야 한다.
      const topTier = Math.max(...tiers.map((t) => t.rate ?? 0))
      expect(topTier + preferentialSum).toBeCloseTo(product.maxRate ?? 0, 2)
    })

    it.each((detail.terms ?? []).map((t) => [t.termsName, t] as const))(
      "상세에 실린 약관 %s 의 전문이 있고 메타데이터가 같다",
      (_, term) => {
        // 상세 목록에는 있는데 전문이 없으면 C-03 [보기]가 404 로 떨어진다.
        // 버전이 다르면 동의 이력(termsId·version)이 엉뚱한 버전으로 실린다.
        const view = buildProductTermsView(product, term.termsId ?? 0)
        expect(view).toBeDefined()
        expect(view?.termsName).toBe(term.termsName)
        expect(view?.version).toBe(term.version)
        expect(view?.required).toBe(term.required)
        expect(view?.viewRequired).toBe(term.viewRequired)
        expect(view?.content?.length ?? 0).toBeGreaterThan(0)
      },
    )

    it("상품설명서가 상세와 같은 상품명·금리·가입기간을 적는다", () => {
      const explanation = (detail.terms ?? []).find(
        (t) => t.termsName === "상품설명서",
      )
      const content =
        buildProductTermsView(product, explanation?.termsId ?? 0)?.content ?? ""
      expect(content).toContain(product.productName ?? "")
      expect(content).toContain(`기본금리: 연 ${product.baseRate}%`)
      expect(content).toContain(`최고금리: 연 ${product.maxRate}%`)
      expect(content).toContain(
        `가입기간: ${product.minTermMonths}개월 ~ ${product.maxTermMonths}개월`,
      )
    })

    it("상세에 없는 약관 ID 는 전문이 없다", () => {
      expect(buildProductTermsView(product, 999)).toBeUndefined()
    })
  },
)
