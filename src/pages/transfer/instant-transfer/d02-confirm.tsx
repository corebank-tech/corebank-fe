import * as React from "react"
import { Button } from "@/shared/ui/button"
import { FormSection } from "@/shared/ui/form-section"
import { StepLayout } from "@/shared/ui/step-layout"
import { ConfirmSummary } from "@/shared/ui/confirm-summary"

type InstantTransferStep2Props = {
  steps: string[]
  scheduledAt: React.ReactNode
  fromAccount: React.ReactNode
  toAccount: React.ReactNode
  payeeName: React.ReactNode
  amount: React.ReactNode
  fee: React.ReactNode
  /** 출금 후 예상잔액. REQ-TRSF-008. */
  balanceAfter: React.ReactNode
  payeeMemo: React.ReactNode
  myMemo: React.ReactNode
  /** 잔액 부족·계좌비밀번호 불일치 등 실행 직전 검증에서 발생한 오류. */
  authError?: string | null
  onPrev: () => void
  /**
   * [이체하기] 클릭 시 호출. 거래내용 확인 모달(REQ-TRSF-031)과 계좌비밀번호
   * 검증·OTP 인증(REQ-TRSF-009)은 화면 조립 컴포넌트가 이어서 처리한다.
   */
  onSubmit: () => void
}

/** D-02 즉시이체 2단계 · 정보확인 및 인증 */
export const InstantTransferStep2 = ({
  steps,
  scheduledAt,
  fromAccount,
  toAccount,
  payeeName,
  amount,
  fee,
  balanceAfter,
  payeeMemo,
  myMemo,
  authError,
  onPrev,
  onSubmit,
}: InstantTransferStep2Props) => {
  return (
    <StepLayout
      steps={steps}
      currentStep={2}
      title="즉시이체"
      notice={[
        "아래 이체 내용을 확인한 뒤 [이체하기]를 누르면 거래내용 확인, 계좌비밀번호 검증, OTP 인증 순으로 진행됩니다.",
        "받는분과 이체금액이 맞는지 다시 확인하세요. 이체 후에는 취소할 수 없습니다.",
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
            이체하기
          </Button>
        </>
      }
    >
      <FormSection title="이체내용 확인">
        <ConfirmSummary
          columns={[
            { label: "이체예정일시", value: scheduledAt },
            { label: "출금계좌", value: fromAccount },
            { label: "입금은행", value: "당행" },
            { label: "입금계좌", value: toAccount },
            { label: "예금주", value: payeeName },
            { label: "이체금액(원)", value: amount, emphasis: true },
            { label: "수수료(원)", value: fee },
            { label: "출금후예상잔액(원)", value: balanceAfter },
            {
              label: "표시내용",
              value: (
                <div className="flex flex-col gap-0.5 text-left text-xs">
                  <span>받는분 {payeeMemo}</span>
                  <span>내 통장 {myMemo}</span>
                </div>
              ),
            },
          ]}
        />
        <p className="mt-2 text-2xs text-ink-faint">
          ※ 당행이체는 수수료가 발생하지 않습니다.
        </p>
        <p className="mt-1 text-2xs text-ink-faint">
          ※ 이체예정일시는 인증 완료 후 실제 처리 시각으로 확정됩니다.
        </p>
      </FormSection>

      <FormSection title="인증 절차">
        <p className="text-base leading-relaxed text-ink-muted">
          [이체하기]를 누르면 거래내용 확인 모달이 열립니다. 확인을 선택하면
          출금계좌의 계좌비밀번호를 검증하고, 이어서 OTP 인증을 완료해야 이체가
          실행됩니다.
        </p>
        {authError && (
          <p role="alert" className="mt-2 text-base font-bold text-danger">
            {authError}
          </p>
        )}
      </FormSection>
    </StepLayout>
  )
}
