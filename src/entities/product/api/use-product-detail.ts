import { useGetProductDetail } from "@/shared/api/generated"

/**
 * 상품 상세. C-02·C-03·C-04·C-05가 같은 값을 본다.
 */
export const useProductDetail = (productId: number) => {
  const { data, isLoading, isError } = useGetProductDetail(productId, {
    query: { enabled: Number.isFinite(productId) },
  })

  return {
    detail: data,
    isLoading,
    isError,
  }
}
