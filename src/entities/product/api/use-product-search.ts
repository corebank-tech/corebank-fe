/**
 * 상품목록(C-01).
 *
 * 생성 훅을 그대로 다시 내보낸다. 화면이 `@/shared/api/generated` 를 직접 참조하지
 * 않도록 통로만 만드는 것이 목적이라, 여기서 시그니처를 감싸지 않는다.
 */
export {
  useSearchProducts as useProductSearch,
  SearchProductsProductGroup,
  SearchProductsSort,
} from "@/shared/api/generated"
export type { SearchProductsParams } from "@/shared/api/generated"
