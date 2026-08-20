import { formatAmount } from "@/shared/lib/format"
import type {
  ProductDetailResponse,
  ProductListItemResponse,
} from "@/shared/api/generated/model"
import type {
  ProductCard,
  ProductCategory,
  ProductDetailData,
  ProductGuideItem,
  ProductRateRow,
} from "@/entities/product/model/types"

const PRODUCT_GROUP_TO_CATEGORY: Record<string, ProductCategory> = {
  DEPOSIT: "정기예금",
  SAVINGS: "정기적금",
}

/** 상품목록(C-01) 응답 한 건을 카드 표시용 타입으로 변환한다. */
export const toProductCard = (item: ProductListItemResponse): ProductCard => ({
  id: item.productId ?? 0,
  category: PRODUCT_GROUP_TO_CATEGORY[item.productGroup ?? "DEPOSIT"],
  name: item.productName ?? "",
  summary: item.summary ?? "",
  maxRate: item.maxRate ?? 0,
  baseRate: item.baseRate ?? 0,
  period: `${item.minTermMonths ?? 0}개월 ~ ${item.maxTermMonths ?? 0}개월`,
  minAmount: item.minAmount ?? 0,
  maxAmount: item.maxAmount ?? 0,
})

/**
 * 우대금리는 조건 단위 값이라 기간 축이 없다(product_preferential_rate에 term 컬럼 없음).
 * 가입 사전검증의 applied_rate = base_rate + preferential_rate 규칙과 맞추기 위해
 * 전 구간에 조건 합산값을 동일 적용한다.
 */
const toRateRows = (detail: ProductDetailResponse): ProductRateRow[] => {
  const primeRate = (detail.preferentialRates ?? []).reduce(
    (sum, r) => sum + (r.rate ?? 0),
    0,
  )
  return (detail.rateTiers ?? []).map((tier) => ({
    period: `${tier.termMonths ?? 0}개월`,
    baseRate: tier.rate ?? 0,
    primeRate,
    maxRate: (tier.rate ?? 0) + primeRate,
  }))
}

const toGuideItems = (detail: ProductDetailResponse): ProductGuideItem[] => {
  const termOptions = detail.termOptions ?? []
  return [
    { label: "가입대상", value: detail.eligibility ?? "" },
    {
      label: "가입기간",
      value:
        termOptions.length > 0
          ? `${termOptions[0]}개월 이상 ${termOptions[termOptions.length - 1]}개월 이하`
          : "",
    },
    {
      label: "가입금액",
      value: `최소 ${formatAmount(detail.minAmount ?? 0)} 이상, 최대 ${formatAmount(detail.maxAmount ?? 0)} 이하`,
    },
  ]
}

/** termOptions 중 최소/최대 가입기간(개월). 비어있으면 0으로 취급한다. */
export const getProductTermRange = (
  detail: ProductDetailResponse,
): { minTermMonths: number; maxTermMonths: number } => {
  const options = detail.termOptions ?? []
  return {
    minTermMonths: options.length > 0 ? Math.min(...options) : 0,
    maxTermMonths: options.length > 0 ? Math.max(...options) : 0,
  }
}

/**
 * 가입기간(개월)에 해당하는 적용금리(기본금리+우대금리 합산, 연 %)를 찾는다.
 * 정확히 일치하는 구간이 없으면 가장 가까운 구간을 참고값으로 쓴다(REQ-PRDT-009는
 * 정확한 가입기간별 금리 조회를 요구하지 않고, 화면도 "참고값"으로 안내한다).
 */
export const getAppliedRateForTerm = (
  detail: ProductDetailResponse,
  termMonths: number,
): number => {
  const primeRate = (detail.preferentialRates ?? []).reduce(
    (sum, r) => sum + (r.rate ?? 0),
    0,
  )
  const tiers = detail.rateTiers ?? []
  if (tiers.length === 0) return primeRate
  const closest = tiers.reduce((best, tier) =>
    Math.abs((tier.termMonths ?? 0) - termMonths) <
    Math.abs((best.termMonths ?? 0) - termMonths)
      ? tier
      : best,
  )
  return (closest.rate ?? 0) + primeRate
}

/** 상품상세(C-02) 응답을 화면 표시용 타입으로 변환한다. */
export const toProductDetailData = (
  detail: ProductDetailResponse,
): ProductDetailData => {
  const termOptions = detail.termOptions ?? []
  return {
    id: detail.productId ?? 0,
    category: PRODUCT_GROUP_TO_CATEGORY[detail.productGroup ?? "DEPOSIT"],
    name: detail.productName ?? "",
    // summary는 상세 응답에 없다(목록 응답 전용 필드) — BE가 추가하기 전까지 상품설명으로 대체한다.
    summary: detail.description ?? "",
    maxRate: detail.maxRate ?? 0,
    period:
      termOptions.length > 0
        ? `${termOptions[0]}개월 ~ ${termOptions[termOptions.length - 1]}개월`
        : "",
    minAmount: detail.minAmount ?? 0,
    maxAmount: detail.maxAmount ?? 0,
    guide: toGuideItems(detail),
    rates: toRateRows(detail),
    notices: detail.notices ?? [],
  }
}
