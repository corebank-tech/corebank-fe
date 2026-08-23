import * as React from "react"
import { useNavigate } from "react-router"
import { keepPreviousData } from "@tanstack/react-query"
import {
  ProductCardGrid,
  type CategoryFilter,
  type SortKey,
} from "@/pages/product/product-card-grid"
import { toProductCard } from "@/entities/product"
import {
  useProductSearch,
  SearchProductsProductGroup,
  SearchProductsSort,
} from "@/entities/product"

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

  const { data, isLoading, isError } = useProductSearch(
    {
      productGroup: filter === "전체" ? undefined : CATEGORY_TO_GROUP[filter],
      sort: SORT_KEY_TO_SERVER[sort],
      size: PAGE_SIZE,
    },
    // 필터/정렬을 바꾸면 새 쿼리 키라 곧장 로딩으로 빠진다. 결과가 올 때까지 이전
    // 목록을 유지해서 필터 칩이 화면째로 사라졌다 돌아오지 않게 한다.
    { query: { placeholderData: keepPreviousData } },
  )

  const page = data
  const products = (page?.items ?? []).map(toProductCard)

  return (
    <ProductCardGrid
      products={products}
      filter={filter}
      onFilterChange={setFilter}
      sort={sort}
      onSortChange={setSort}
      onViewDetail={(id) => navigate(`/products/${id}`)}
      onJoin={(id) => navigate(`/product/${id}/join/1`)}
      isLoading={isLoading}
      isError={isError}
    />
  )
}
