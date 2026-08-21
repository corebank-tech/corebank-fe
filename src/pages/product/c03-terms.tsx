import * as React from "react"
import { useNavigate, useParams } from "react-router"
import { Button } from "@/shared/ui/button"
import { StepLayout } from "@/shared/ui/step-layout"
import { TermsAgreement } from "@/widgets"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { toProductDetailData } from "@/entities/product"
import {
  PRODUCT_JOIN_STEPS,
  type AgreedTerm,
  type ProductJoinTermsState,
} from "@/pages/product/join-shared"
import { Alert } from "@/shared/ui/alert"
import { EmptyState } from "@/shared/ui/empty-state"
import { useGetProductDetail } from "@/shared/api/generated/product-controller/product-controller"
import { getProductTerms } from "@/shared/api/generated/product-controller/product-controller"
import type {
  ProductDetailResponse,
  ProductTermsViewResponse,
} from "@/shared/api/generated/model"
import type { TermItem } from "@/shared/types/term"

/** C-03 상품가입 1단계 · 약관동의 (REQ-PRDT-005) */
export const C03Terms = () => {
  const { productId } = useParams()
  const navigate = useNavigate()
  const id = Number(productId)
  const { data, isLoading, isError } = useGetProductDetail(id, {
    query: { enabled: Number.isFinite(id) },
  })
  const [allRequiredAgreed, setAllRequiredAgreed] = React.useState(false)
  const [agreedIds, setAgreedIds] = React.useState<string[]>([])
  // 전문은 [보기]를 누른 시점에 받아온다. 미리 전부 받아두면 열지도 않은 약관에
  // 열람 이력이 남아, 서버의 전문 미열람 검증(PRD0005)이 무의미해진다.
  const [termBodies, setTermBodies] = React.useState<Record<string, string>>({})

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

  // 상품 상세가 실어 보내는 약관 목록을 그대로 쓴다. 동의 이력은 termsId·version
  // 쌍으로 저장되므로 화면 id도 termsId를 문자열로 쓴다.
  const terms: TermItem[] = (detail.terms ?? [])
    .slice()
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .map((t) => ({
      id: String(t.termsId ?? ""),
      required: t.required ?? false,
      title: t.termsName ?? "",
      question: `${t.termsName ?? ""}을(를) 확인하였으며 이에 동의합니다.`,
      body:
        termBodies[String(t.termsId ?? "")] ??
        "약관 전문을 불러오는 중입니다...",
    }))

  const handleViewTerm = async (id: string) => {
    if (termBodies[id]) return
    try {
      const response = await getProductTerms(product.id, Number(id))
      const view = response as unknown as ProductTermsViewResponse | undefined
      setTermBodies((prev) => ({ ...prev, [id]: view?.content ?? "" }))
    } catch {
      setTermBodies((prev) => ({
        ...prev,
        [id]: "약관 전문을 불러오지 못했습니다. [보기]를 다시 눌러주세요.",
      }))
    }
  }

  const handleNext = () => {
    // 필수만 보내면 고객이 동의한 선택 약관이 이력에서 누락된다. 실제로 체크한
    // 항목을 그대로 싣는다.
    const agreedTerms: AgreedTerm[] = (detail.terms ?? [])
      .filter((t) => agreedIds.includes(String(t.termsId ?? "")))
      .map((t) => ({ termsId: t.termsId ?? 0, version: t.version ?? "" }))
    const state: ProductJoinTermsState = { agreedTerms }
    navigate(`/product/${product.id}/join/2`, { state })
  }

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
            onClick={handleNext}
          >
            다음
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <TermsAgreement
            terms={terms}
            onView={handleViewTerm}
            onAllRequiredAgreedChange={setAllRequiredAgreed}
            onAgreedChange={setAgreedIds}
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
