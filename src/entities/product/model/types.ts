/** 취급 상품은 정기예금·정기적금 2종뿐이다(POL-029). */
export type ProductCategory = "정기예금" | "정기적금"

export type ProductSaleStatus = "ON_SALE" | "SUSPENDED"

/** 상품목록(C-01)에 노출되는 정기예금·정기적금 카드. */
export type ProductCard = {
  id: number
  category: ProductCategory
  name: string
  summary: string
  /** 최고 금리 (연, 세전, %). */
  maxRate: number
  /** 기본 금리 (연, 세전, %). */
  baseRate: number
  /** 가입기간 표기 문자열. */
  period: string
  /** 최소 가입금액 (원). */
  minAmount: number
  /** 가입금액 상한 (원). */
  maxAmount: number
}

export type ProductGuideItem = {
  label: string
  value: string
}

export type ProductRateRow = {
  period: string
  /** 기본금리 (%). */
  baseRate: number
  /** 우대금리 (%). */
  primeRate: number
  /** 최고금리 (%). */
  maxRate: number
}

/** 상품상세(C-02) 데이터. 상품목록(C-01)의 id 별로 조회한다. */
export type ProductDetailData = {
  id: number
  category: ProductCategory
  name: string
  summary: string
  /** 최고 금리 (연, 세전, %). */
  maxRate: number
  period: string
  minAmount: number
  maxAmount: number
  guide: ProductGuideItem[]
  rates: ProductRateRow[]
  notices: string[]
  saleStatus: ProductSaleStatus
}
