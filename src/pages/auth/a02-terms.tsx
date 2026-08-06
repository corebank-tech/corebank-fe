import * as React from "react"
import { Button } from "@/shared/ui/button"
import { StepLayout } from "@/shared/ui/step-layout"
import { TermsAgreement, type TermsAgreementHandle } from "@/widgets"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { SIGNUP_TERMS } from "@/entities/auth"
import { SIGNUP_STEPS } from "@/pages/auth/signup-shared"

type A02TermsProps = {
  onNext: () => void
}

/** A-02 회원가입 1단계 · 약관동의 (REQ-AUTH-003·004) */
export const A02Terms = ({ onNext }: A02TermsProps) => {
  const termsRef = React.useRef<TermsAgreementHandle>(null)

  return (
    <>
      <StepLayout
        steps={SIGNUP_STEPS}
        currentStep={1}
        title="회원가입"
        notice={[
          "개인 회원가입만 제공하며, 기업회원·i-PIN회원 가입은 지원하지 않습니다.",
          "약관 전문을 열람한 항목만 동의 체크가 가능합니다.",
        ]}
        footer={
          <Button
            variant="primary"
            size="lg"
            className="min-w-40"
            onClick={() => {
              if (termsRef.current?.validateProceed()) onNext()
            }}
          >
            다음
          </Button>
        }
      >
        <TermsAgreement ref={termsRef} terms={SIGNUP_TERMS} />
      </StepLayout>

      <NoticeBoxFooter
        className="mt-8"
        items={[
          "회원가입은 서비스 이용약관, 개인정보 수집·이용 동의서 2종에 모두 동의해야 진행할 수 있습니다.",
          "다음 단계에서는 본인 명의의 당행 계좌로 실명을 확인합니다.",
        ]}
      />
    </>
  )
}
