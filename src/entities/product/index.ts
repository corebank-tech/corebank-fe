export type {
  JoinWithdrawAccount,
  ProductCard,
  ProductCategory,
  ProductDetailData,
  ProductGuideItem,
  ProductJoinMaster,
  ProductRateRow,
} from "@/entities/product/model/types"
export {
  MOCK_PRODUCTS,
  MOCK_PRODUCT_DETAILS,
} from "@/entities/product/api/products"
export {
  MOCK_JOIN_PRODUCTS,
  MOCK_JOIN_ACCOUNTS,
} from "@/entities/product/api/product-join"
export {
  addMonthsWithEomCorrection,
  estimateMaturityAmount,
} from "@/entities/product/lib/product-join-calc"
export { getProductCategoryBadgeVariant } from "@/entities/product/lib/status-badge"
export {
  toProductCard,
  toProductDetailData,
  getProductTermRange,
  getAppliedRateForTerm,
} from "@/entities/product/lib/mappers"

export { useProductDetail } from "@/entities/product/api/use-product-detail"
export {
  useProductSearch,
  SearchProductsProductGroup,
  SearchProductsSort,
} from "@/entities/product/api/use-product-search"
export type { SearchProductsParams } from "@/entities/product/api/use-product-search"
export {
  fetchProductTerms,
  fetchSubscriptionResult,
  useExecuteSubscription,
  useValidateSubscription,
} from "@/entities/product/api/product-subscription"
export type {
  ProductSubscriptionExecuteResponse,
  ProductSubscriptionResultResponse,
  ProductSubscriptionValidationResponse,
  ProductTermsViewResponse,
  ViolationItem,
} from "@/entities/product/api/product-subscription"
