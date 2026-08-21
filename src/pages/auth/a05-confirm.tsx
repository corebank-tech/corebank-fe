import { Button } from "@/shared/ui/button"
import { StepLayout } from "@/shared/ui/step-layout"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { maskName, maskEmail, maskPhone } from "@/shared/lib/format"
import { SIGNUP_STEPS, type SignupData } from "@/pages/auth/signup-shared"

type A05ConfirmProps = {
  data: SignupData
  onEdit: () => void
  onComplete: () => void
}

const birthToDisplay = (birth: string): string => {
  if (birth.length !== 6) return birth
  return `${birth.slice(0, 2)}.${birth.slice(2, 4)}.${birth.slice(4, 6)}`
}

/** A-05 회원가입 4단계 · 입력확인. REQ-AUTH-018: 개인정보 마스킹 재표시. */
export const A05Confirm = ({ data, onEdit, onComplete }: A05ConfirmProps) => {
  return (
    <StepLayout
      steps={SIGNUP_STEPS}
      currentStep={4}
      title="회원가입"
      notice={["아래 입력하신 정보를 확인한 뒤 가입완료를 진행하세요."]}
      footer={
        <>
          <Button
            variant="secondary"
            size="lg"
            className="min-w-40"
            onClick={onEdit}
          >
            정보수정
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="min-w-40"
            onClick={onComplete}
          >
            가입완료
          </Button>
        </>
      }
    >
      <FormSection title="입력정보 확인">
        <div>
          <FormRow label="성명" labelWidth={180}>
            <span className="text-base text-ink">{maskName(data.name)}</span>
          </FormRow>
          <FormRow label="아이디" labelWidth={180}>
            <span className="text-base text-ink">{data.userId}</span>
          </FormRow>
          <FormRow label="생년월일" labelWidth={180}>
            <span className="text-base text-ink">
              {birthToDisplay(data.birth)}
            </span>
          </FormRow>
          <FormRow label="휴대폰번호" labelWidth={180}>
            <span className="text-base text-ink">{maskPhone(data.phone)}</span>
          </FormRow>
          <FormRow label="이메일" labelWidth={180}>
            <span className="text-base text-ink">{maskEmail(data.email)}</span>
          </FormRow>
        </div>
      </FormSection>
    </StepLayout>
  )
}
