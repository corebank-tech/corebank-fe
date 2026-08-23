import { useNavigate } from "react-router"
import { Button } from "@/shared/ui/button"
import { StepLayout } from "@/shared/ui/step-layout"
import { EmptyState } from "@/shared/ui/empty-state"
import { PRODUCT_JOIN_STEPS } from "@/pages/product/join-shared"

type Props = {
  /** 이 안내를 띄우는 단계. 스텝 표시만 달라진다. */
  currentStep: number
}

/**
 * 라우터 state 가 없어 진행할 수 없을 때 C-05·C-06 이 함께 쓰는 안내.
 *
 * 각 화면이 같은 문구·같은 동선을 따로 적어 두면 한쪽만 고쳤을 때 갈린다.
 * 갈리지 않는다는 약속을 주석이 아니라 호출 지점 하나로 고정한다.
 */
export const ProductJoinRestartNotice = ({ currentStep }: Props) => {
  const navigate = useNavigate()

  return (
    <StepLayout
      steps={PRODUCT_JOIN_STEPS}
      currentStep={currentStep}
      title="상품가입"
    >
      <EmptyState
        message="가입 정보를 확인할 수 없습니다."
        description="상품가입을 처음부터 다시 진행하세요."
        action={
          <Button
            variant="primary"
            size="lg"
            className="min-w-40"
            onClick={() => navigate("/products")}
          >
            상품몰로 이동
          </Button>
        }
      />
    </StepLayout>
  )
}
