import { useGetProductDetail } from "@/shared/api/generated/product-controller/product-controller"
import type { ProductDetailResponse } from "@/shared/api/generated/model"

/**
 * 상품 상세. C-02·C-03·C-04·C-05가 같은 값을 본다.
 *
 * orval이 생성한 타입은 스펙에 적힌 공통 응답 봉투(ApiResponse<T>) 그대로지만
 * customFetch가 런타임에는 이미 봉투를 벗겨 data만 돌려준다. 그 어긋남을 화면마다
 * `as unknown as`로 되돌리고 있어서 여기 한 곳으로 모은다.
 */
export const useProductDetail = (productId: number) => {
  const { data, isLoading, isError } = useGetProductDetail(productId, {
    query: { enabled: Number.isFinite(productId) },
  })

  return {
    detail: data as unknown as ProductDetailResponse | undefined,
    isLoading,
    isError,
  }
}
