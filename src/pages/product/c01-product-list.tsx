import * as React from "react"
import { useNavigate } from "react-router"
import {
  ProductCardGrid,
  type CategoryFilter,
  type SortKey,
} from "@/pages/product/product-card-grid"
import { toProductCard } from "@/entities/product"
import { useSearchProducts } from "@/shared/api/generated/product-controller/product-controller"
import {
  SearchProductsProductGroup,
  SearchProductsSort,
  type PageResponseProductListItemResponse,
} from "@/shared/api/generated/model"

const CATEGORY_TO_GROUP: Record<
  Exclude<CategoryFilter, "전체">,
  SearchProductsProductGroup
> = {
  정기예금: SearchProductsProductGroup.DEPOSIT,
  정기적금: SearchProductsProductGroup.SAVINGS,
}

const SORT_KEY_TO_SERVER: Record<SortKey, SearchProductsSort> = {
  rate: SearchProductsSort.RATE,
  latest: SearchProductsSort.NEW,
}

// 페이지네이션 UI 도입 전까지는 전체 상품(12건)이 한 페이지에 들어오도록 넉넉히 잡는다.
const PAGE_SIZE = 20

/** C-01 상품몰 - 상품목록. REQ-PRDT-001·002. */
export const C01ProductList = () => {
  const navigate = useNavigate()
  const [filter, setFilter] = React.useState<CategoryFilter>("전체")
  const [sort, setSort] = React.useState<SortKey>("rate")

  const { data, isLoading, isError } = useSearchProducts({
    productGroup: filter === "전체" ? undefined : CATEGORY_TO_GROUP[filter],
    sort: SORT_KEY_TO_SERVER[sort],
    size: PAGE_SIZE,
  })

  // orval이 생성한 타입은 스펙에 적힌 공통 응답 봉투(ApiResponse<T>) 그대로다.
  // customFetch가 런타임에는 이미 봉투를 벗겨 data만 돌려주므로, 실제 형태로 다시 맞춰준다.
  const page = data as unknown as
    PageResponseProductListItemResponse | undefined
  const products = (page?.items ?? []).map(toProductCard)

  if (isLoading) {
    return (
      <div className="py-20 text-center text-ink-muted">불러오는 중...</div>
    )
  }

  if (isError) {
    return (
      <div className="py-20 text-center text-ink-muted">
        상품 목록을 불러오지 못했습니다.
      </div>
    )
  }

  return (
    <ProductCardGrid
      products={products}
      filter={filter}
      onFilterChange={setFilter}
      sort={sort}
      onSortChange={setSort}
      onViewDetail={(id) => navigate(`/products/${id}`)}
      onJoin={(id) => navigate(`/product/${id}/join/1`)}
    />
  )
}
