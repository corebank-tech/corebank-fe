import * as React from "react"
import { Button } from "@/shared/ui/button"
import { FormSection } from "@/shared/ui/form-section"
import { StepLayout } from "@/shared/ui/step-layout"
import { ConfirmSummary } from "@/shared/ui/confirm-summary"

type ReservedTransferStep2Props = {
  steps: string[]
  scheduledDate: React.ReactNode
  fromAccount: React.ReactNode
  toAccount: React.ReactNode
  payeeName: React.ReactNode
  amount: React.ReactNode
  fee: React.ReactNode
  payeeMemo: React.ReactNode
  onPrev: () => void
  /** [등록하기] 클릭 시 호출. 거래내용 확인 모달과 OTP 인증은 화면 조립 컴포넌트가 이어서 처리한다. */
  onSubmit: () => void
}

/** E-02 예약이체 등록 2단계 · 정보확인 및 인증 */
export const ReservedTransferStep2 = ({
  steps,
  scheduledDate,
  fromAccount,
  toAccount,
  payeeName,
  amount,
  fee,
  payeeMemo,
  onPrev,
  onSubmit,
}: ReservedTransferStep2Props) => {
  return (
    <StepLayout
      steps={steps}
      currentStep={2}
      title="예약이체"
      notice={[
        "아래 예약이체 내용을 확인한 뒤 계좌비밀번호와 OTP로 인증하면 등록이 완료됩니다.",
        "등록 후에는 이체 예정일 전일 23:59:59까지 취소할 수 있습니다.",
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
      <FormSection title="예약이체 내용 확인">
        <ConfirmSummary
          columns={[
            { label: "이체예정일자", value: scheduledDate },
            { label: "출금계좌", value: fromAccount },
            { label: "입금계좌", value: toAccount },
            { label: "받는분", value: payeeName },
            { label: "이체금액(원)", value: amount, emphasis: true },
            { label: "수수료(원)", value: fee },
            { label: "받는통장 메모", value: payeeMemo },
          ]}
        />
        <p className="mt-2 text-2xs text-ink-faint">
          ※ 당행이체는 수수료가 발생하지 않습니다.
        </p>
        <p className="mt-1 text-2xs text-ink-faint">
          ※ 이체 예정시각은 별도로 지정하지 않으며, 예정일자의 배치 실행 시각에
          일괄 처리됩니다.
        </p>
      </FormSection>
    </StepLayout>
  )
}
