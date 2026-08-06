import { useNavigate } from "react-router"
import { Check } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { StepLayout } from "@/shared/ui/step-layout"
import { SIGNUP_STEPS } from "@/pages/auth/signup-shared"

type A06CompleteProps = {
  name: string
}

/** A-06 회원가입 5단계 · 가입완료. REQ-AUTH-019. */
export const A06Complete = ({ name }: A06CompleteProps) => {
  const navigate = useNavigate()
  return (
    <StepLayout
      steps={SIGNUP_STEPS}
      currentStep={5}
      title="회원가입"
      footer={
        <Button
          variant="primary"
          size="lg"
          className="min-w-50"
          onClick={() => navigate("/")}
        >
          로그인 화면으로 이동
        </Button>
      }
    >
      <div className="flex flex-col items-center py-8 text-center">
        <span
          className="inline-flex h-18 w-[72px] items-center justify-center rounded-full bg-primary-tint text-primary"
          aria-hidden="true"
        >
          <Check className="h-9 w-9" strokeWidth={2.5} />
        </span>
        <p className="mt-4 text-h2 font-bold text-balance text-ink">
          {name}님, 회원가입이 완료되었습니다.
        </p>
        <p className="mt-2 text-base leading-relaxed text-ink-muted">
          등록하신 아이디와 비밀번호로 로그인하실 수 있습니다.
        </p>
      </div>
    </StepLayout>
  )
}
