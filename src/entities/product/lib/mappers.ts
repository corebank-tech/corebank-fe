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
