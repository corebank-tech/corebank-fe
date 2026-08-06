import * as React from "react"
import { useNavigate, useParams } from "react-router"
import { Button } from "@/shared/ui/button"
import { StepLayout } from "@/shared/ui/step-layout"
import { TermsAgreement } from "@/widgets"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { MOCK_JOIN_PRODUCTS, MOCK_JOIN_TERMS } from "@/entities/product"
import { PRODUCT_JOIN_STEPS } from "@/pages/product/join-shared"

/** C-03 상품가입 1단계 · 약관동의 (REQ-PRDT-005) */
export const C03Terms = () => {
  const { productId = "P001" } = useParams()
  const navigate = useNavigate()
  const product = MOCK_JOIN_PRODUCTS[productId] ?? MOCK_JOIN_PRODUCTS.P001
  const [allRequiredAgreed, setAllRequiredAgreed] = React.useState(false)

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
        <TermsAgreement
          terms={MOCK_JOIN_TERMS}
          onAllRequiredAgreedChange={setAllRequiredAgreed}
        />
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
