import { useNavigate } from "react-router"
import { ProductCardGrid } from "@/pages/product/product-card-grid"
import { MOCK_PRODUCTS } from "@/entities/product"

/** C-01 상품몰 - 상품목록. REQ-PRDT-001·002. */
export const C01ProductList = () => {
  const navigate = useNavigate()

  return (
    <ProductCardGrid
      products={MOCK_PRODUCTS}
      onViewDetail={(id) => navigate(`/products/${id}`)}
      onJoin={(id) => navigate(`/product/${id}/join/1`)}
    />
  )
}
