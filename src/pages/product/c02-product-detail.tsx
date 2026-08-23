import { useNavigate, useParams } from "react-router"
import { ProductDetail } from "@/pages/product/product-detail"
import { EmptyState } from "@/shared/ui/empty-state"
import { toProductDetailData, useProductDetail } from "@/entities/product"

/** C-02 상품 상세. REQ-PRDT-003. */
export const C02ProductDetail = () => {
  const { productId } = useParams()
  const navigate = useNavigate()
  const id = Number(productId)

  const { detail, isLoading, isError } = useProductDetail(id)

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
