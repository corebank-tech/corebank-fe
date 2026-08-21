import * as React from "react"
import { useNavigate, useParams } from "react-router"
import { Button } from "@/shared/ui/button"
import { StepLayout } from "@/shared/ui/step-layout"
import { TermsAgreement } from "@/widgets"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { MOCK_JOIN_TERMS, toProductDetailData } from "@/entities/product"
import { PRODUCT_JOIN_STEPS } from "@/pages/product/join-shared"
import { Alert } from "@/shared/ui/alert"
import { EmptyState } from "@/shared/ui/empty-state"
import { useGetProductDetail } from "@/shared/api/generated/product-controller/product-controller"
import type { ProductDetailResponse } from "@/shared/api/generated/model"

/** C-03 상품가입 1단계 · 약관동의 (REQ-PRDT-005) */
export const C03Terms = () => {
  const { productId } = useParams()
  const navigate = useNavigate()
  const id = Number(productId)
  const { data, isLoading, isError } = useGetProductDetail(id, {
    query: { enabled: Number.isFinite(id) },
  })
  const [allRequiredAgreed, setAllRequiredAgreed] = React.useState(false)

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

  const product = toProductDetailData(detail)

  return (
    <>
      <StepLayout
        steps={PRODUCT_JOIN_STEPS}
        currentStep={1}
        title={`${product.name} 가입`}
        notice={[
          "약관 및 상품설명서를 모두 확인한 뒤 동의해야 다음 단계로 진행할 수 있습니다.",
          "각 항목의 [보기]를 눌러 전문을 확인할 수 있습니다.",
        ]}
        footer={
          <Button
            variant="primary"
            size="lg"
            className="min-w-40"
            disabled={!allRequiredAgreed}
            onClick={() => navigate(`/product/${product.id}/join/2`)}
          >
            다음
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <TermsAgreement
            terms={MOCK_JOIN_TERMS}
            onAllRequiredAgreedChange={setAllRequiredAgreed}
          />

          {allRequiredAgreed && (
            <Alert variant="success">
              필수 약관을 모두 확인하고 동의했습니다.
            </Alert>
          )}
        </div>
      </StepLayout>

      <NoticeBoxFooter
        className="mt-8"
        items={[
          "동의 이력은 가입 완료 후에도 보관됩니다.",
          "필수 항목에 동의하지 않으면 상품에 가입할 수 없습니다.",
        ]}
      />
    </>
  )
}
