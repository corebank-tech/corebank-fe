import * as React from "react"
import { Button } from "@/shared/ui/button"
import { FormSection } from "@/shared/ui/form-section"
import { StepLayout } from "@/shared/ui/step-layout"
import { ConfirmSummary } from "@/shared/ui/confirm-summary"

type AutoTransferStep2Props = {
  steps: string[]
  fromAccount: React.ReactNode
  toAccount: React.ReactNode
  payeeName: React.ReactNode
  amount: React.ReactNode
  cycle: React.ReactNode
  dayOfMonth: React.ReactNode
  period: React.ReactNode
  payeeMemo: React.ReactNode
  onPrev: () => void
  /** [등록하기] 클릭 시 호출. 거래내용 확인 모달과 OTP 인증은 화면 조립 컴포넌트가 이어서 처리한다. */
  onSubmit: () => void
}

/** G-02 자동이체 등록 2단계 · 정보확인 및 인증 */
export const AutoTransferStep2 = ({
  steps,
  fromAccount,
  toAccount,
  payeeName,
  amount,
  cycle,
  dayOfMonth,
  period,
  payeeMemo,
  onPrev,
  onSubmit,
}: AutoTransferStep2Props) => {
  return (
    <StepLayout
      steps={steps}
      currentStep={2}
      title="자동이체"
      notice={[
        "아래 자동이체 내용을 확인한 뒤 계좌비밀번호와 OTP로 인증하면 등록이 완료됩니다.",
        "등록 후 출금계좌·입금계좌·이체지정일은 변경할 수 없습니다.",
      ]}
      footer={
        <>
          <Button
            variant="secondary"
            size="lg"
            className="min-w-30"
            onClick={onPrev}
          >
            이전
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="min-w-40"
            onClick={onSubmit}
          >
            등록하기
          </Button>
        </>
      }
    >
      <FormSection title="자동이체 내용 확인">
        <ConfirmSummary
          columns={[
            { label: "출금계좌", value: fromAccount },
            { label: "입금계좌", value: toAccount },
            { label: "받는분", value: payeeName },
            { label: "이체금액(원)", value: amount, emphasis: true },
            { label: "이체주기", value: cycle },
            { label: "이체지정일", value: dayOfMonth },
            { label: "이체기간", value: period },
            { label: "받는통장 메모", value: payeeMemo },
          ]}
        />
        <p className="mt-2 text-2xs text-ink-faint">
          ※ 당행이체는 수수료가 발생하지 않습니다.
        </p>
        <p className="mt-1 text-2xs text-ink-faint">
          ※ 지정일이 해당 월에 없으면(29·30·31일) 그 달의 말일에 실행됩니다.
        </p>
      </FormSection>
    </StepLayout>
  )
}
