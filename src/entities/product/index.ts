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
  JOIN_DATE,
  MOCK_JOIN_TERMS,
} from "@/entities/product/api/product-join"
export {
  addMonthsWithEomCorrection,
  estimateMaturityAmount,
} from "@/entities/product/lib/product-join-calc"
export { getProductCategoryBadgeVariant } from "@/entities/product/lib/status-badge"
