import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Chip } from "@/shared/ui/chip"
import { Select } from "@/shared/ui/select"
import { EmptyState } from "@/shared/ui/empty-state"
import { formatAmount } from "@/shared/lib/format"
import {
  getProductCategoryBadgeVariant,
  type ProductCard,
  type ProductCategory,
} from "@/entities/product"

export type CategoryFilter = "전체" | ProductCategory
export type SortKey = "rate" | "latest"

type ProductCardGridProps = {
  /** 서버가 필터·정렬까지 적용해 내려준 목록을 그대로 렌더링한다 (직접 필터링/정렬하지 않는다). */
  products: ProductCard[]
  filter?: CategoryFilter
  onFilterChange?: (filter: CategoryFilter) => void
  sort?: SortKey
  onSortChange?: (sort: SortKey) => void
  onViewDetail?: (id: number) => void
  onJoin?: (id: number) => void
  /** 목록 조회 상태. true면 필터·정렬 칩은 그대로 두고 목록 영역만 로딩/에러로 바꾼다. */
  isLoading?: boolean
  isError?: boolean
  /**
   * 조회 실패 시 서버가 준 문구(REQ-CMN-008). 세션 만료처럼 A-11 모달이 안내하는
   * 경우는 null 이라, 실패 여부는 errorMessage 가 아니라 isError 로 본다.
   */
  errorMessage?: string | null
}

const FILTERS: CategoryFilter[] = ["전체", "정기예금", "정기적금"]

/** 상품목록 화면(C-01). 필터·정렬은 서버 파라미터로 나가므로 여기서는 선택 상태만 표시한다. */
export const ProductCardGrid = ({
  products,
  filter = "전체",
  onFilterChange,
  sort = "rate",
  onSortChange,
  onViewDetail,
  onJoin,
  isLoading = false,
  isError = false,
  errorMessage,
}: ProductCardGridProps) => {
  return (
    <div>
      {/* 필터 칩 + 정렬 */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => {
            const active = filter === f
            return (
              <Chip
                key={f}
                size="lg"
                tone={active ? "primary" : "default"}
                onClick={() => onFilterChange?.(f)}
                aria-pressed={active}
                className={active ? undefined : "text-ink-muted"}
              >
                {f}
              </Chip>
            )
          })}
        </div>
        <div className="w-40">
          <Select
            value={sort}
            onChange={(e) => onSortChange?.(e.target.value as SortKey)}
            aria-label="정렬 기준"
          >
            <option value="rate">금리순</option>
            <option value="latest">최신순</option>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-ink-muted">불러오는 중...</div>
      ) : isError ? (
        errorMessage && <EmptyState message={errorMessage} />
      ) : products.length === 0 ? (
        <EmptyState
          message="조회된 상품이 없습니다."
          description="다른 상품 유형을 선택해 다시 확인해 주세요."
        />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {products.map((p) => (
            <article
              key={p.id}
              className="flex flex-col overflow-hidden rounded-lg bg-surface-elevated p-5 shadow-card"
            >
              <div className="mb-3">
                <Badge variant={getProductCategoryBadgeVariant(p.category)}>
                  {p.category}
                </Badge>
              </div>

              <h3 className="line-clamp-2 h-14 text-h2 leading-7 font-bold text-ink">
                {p.name}
              </h3>
              <p className="mt-1 line-clamp-2 h-10 text-base leading-5 text-ink-muted">
                {p.summary}
              </p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-[32px] leading-none font-bold text-primary">
                  {p.maxRate.toFixed(2)}
                </span>
                <span className="text-lg font-bold text-primary">%</span>
                <span className="ml-1 text-xs text-ink-faint">(연, 세전)</span>
              </div>
              <p className="mt-1 text-xs text-ink-faint">
                최고 금리 <span>(기본금리 {p.baseRate.toFixed(2)}%)</span>
              </p>

              <dl className="mt-5 flex flex-col gap-2 border-t border-border pt-4 text-base">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-muted">가입기간</dt>
                  <dd className="font-bold text-ink">{p.period}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-muted">최소금액</dt>
                  <dd className="font-bold text-ink">
                    {formatAmount(p.minAmount)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-muted">최대금액</dt>
                  <dd className="font-bold text-ink">
                    {formatAmount(p.maxAmount)}
                  </dd>
                </div>
              </dl>

              <div className="mt-auto flex gap-2 pt-5">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onViewDetail?.(p.id)}
                >
                  상세보기
                </Button>
                <Button className="flex-1" onClick={() => onJoin?.(p.id)}>
                  가입하기
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
