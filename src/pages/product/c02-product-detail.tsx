import { useNavigate, useParams } from "react-router"
import { ProductDetail } from "@/pages/product/product-detail"
import { EmptyState } from "@/shared/ui/empty-state"
import { toProductDetailData } from "@/entities/product"
import { useGetProductDetail } from "@/shared/api/generated/product-controller/product-controller"
import type { ProductDetailResponse } from "@/shared/api/generated/model"

/** C-02 상품 상세. REQ-PRDT-003. */
export const C02ProductDetail = () => {
  const { productId } = useParams()
  const navigate = useNavigate()
  const id = Number(productId)

  const { data, isLoading, isError } = useGetProductDetail(id, {
    query: { enabled: Number.isFinite(id) },
  })

  // orval이 생성한 타입은 스펙에 적힌 공통 응답 봉투(ApiResponse<T>) 그대로다.
  // customFetch가 런타임에는 이미 봉투를 벗겨 data만 돌려주므로, 실제 형태로 다시 맞춰준다.
  const detail = data as unknown as ProductDetailResponse | undefined

  if (isLoading) {
    return (
      <div className="py-20 text-center text-ink-muted">불러오는 중...</div>
    )
  }

  if (isError || !detail) {
    return (
      <EmptyState
        message="상품을 찾을 수 없습니다."
        description={`상품ID: ${productId}`}
      />
    )
  }

  return (
    <ProductDetail
      product={toProductDetailData(detail)}
      onJoin={(id) => navigate(`/product/${id}/join/1`)}
    />
  )
}
