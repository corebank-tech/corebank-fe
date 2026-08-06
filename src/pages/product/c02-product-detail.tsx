import { useNavigate, useParams } from "react-router"
import { ProductDetail } from "@/pages/product/product-detail"
import { EmptyState } from "@/shared/ui/empty-state"
import { MOCK_PRODUCT_DETAILS } from "@/entities/product"

/** C-02 상품 상세. REQ-PRDT-003. */
export const C02ProductDetail = () => {
  const { productId = "P001" } = useParams()
  const navigate = useNavigate()
  const product = MOCK_PRODUCT_DETAILS[productId]

  if (!product) {
    return (
      <EmptyState
        message="상품을 찾을 수 없습니다."
        description={`상품코드: ${productId}`}
      />
    )
  }

  return (
    <ProductDetail
      product={product}
      onJoin={(id) => navigate(`/product/${id}/join/1`)}
    />
  )
}
