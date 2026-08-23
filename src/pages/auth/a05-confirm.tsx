import * as React from "react"
import { Button } from "@/shared/ui/button"
import { StepLayout } from "@/shared/ui/step-layout"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Alert } from "@/shared/ui/alert"
import { AlertDialog } from "@/shared/ui/alert-dialog"
import {
  useCompleteSignupMutation,
  useSignupConfirmationQuery,
} from "@/entities/auth"
import { isApiError } from "@/shared/api/api-error"
import { SIGNUP_STEPS } from "@/pages/auth/signup-shared"

type A05ConfirmProps = {
  tempSignupToken?: string
  onEdit: () => void
  onComplete: () => void
}

const getErrorMessage = (error: unknown): string => {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return "요청 처리 중 오류가 발생했습니다."
}

/** A-05 회원가입 4단계 · 입력확인. REQ-AUTH-018. */
export const A05Confirm = ({
  tempSignupToken,
  onEdit,
  onComplete,
}: A05ConfirmProps) => {
  const confirmationQuery = useSignupConfirmationQuery(tempSignupToken)

  const completeMutation = useCompleteSignupMutation()

  // 같은 가입완료 요청을 재시도할 때도 동일한 멱등키를 사용하도록 마운트 동안 고정한다.
  const idempotencyKeyRef = React.useRef(crypto.randomUUID())

  const [alert, setAlert] = React.useState<string | null>(null)

  const handleComplete = async () => {
    if (!tempSignupToken) {
      setAlert(
        "회원가입 임시 인증정보가 없습니다. 이전 단계부터 다시 진행해 주세요.",
      )
      return
    }

    try {
      const result = await completeMutation.mutateAsync({
        tempSignupToken,
        idempotencyKey: idempotencyKeyRef.current,
      })

      if (!result.customerId || !result.userId) {
        setAlert("회원가입 완료 정보를 확인하지 못했습니다.")
        return
      }

      onComplete()
    } catch (error) {
      setAlert(getErrorMessage(error))
    }
  }

  const confirmation = confirmationQuery.data

  return (
    <>
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
              disabled={completeMutation.isPending}
              onClick={onEdit}
            >
              정보수정
            </Button>

            <Button
              variant="primary"
              size="lg"
              className="min-w-40"
              disabled={
                !tempSignupToken ||
                confirmationQuery.isPending ||
                confirmationQuery.isError ||
                !confirmation ||
                completeMutation.isPending
              }
              onClick={handleComplete}
            >
              {completeMutation.isPending ? "가입 처리 중..." : "가입완료"}
            </Button>
          </>
        }
      >
        {confirmationQuery.isPending && (
          <Alert variant="info">입력정보를 확인하는 중입니다.</Alert>
        )}

        {confirmationQuery.isError && (
          <Alert variant="danger">
            {getErrorMessage(confirmationQuery.error)}
          </Alert>
        )}

        {!tempSignupToken && (
          <Alert variant="warning">회원가입 임시 인증정보가 없습니다.</Alert>
        )}

        {confirmation && (
          <FormSection title="입력정보 확인">
            <div>
              <FormRow label="성명" labelWidth={180}>
                <span className="text-base text-ink">
                  {confirmation.userName ?? "-"}
                </span>
              </FormRow>

              <FormRow label="아이디" labelWidth={180}>
                <span className="text-base text-ink">
                  {confirmation.userId ?? "-"}
                </span>
              </FormRow>

              <FormRow label="생년월일" labelWidth={180}>
                <span className="text-base text-ink">
                  {confirmation.birthDate ?? "-"}
                </span>
              </FormRow>

              <FormRow label="휴대폰번호" labelWidth={180}>
                <span className="text-base text-ink">
                  {confirmation.phoneNumber ?? "-"}
                </span>
              </FormRow>

              <FormRow label="이메일" labelWidth={180}>
                <span className="text-base text-ink">
                  {confirmation.email ?? "-"}
                </span>
              </FormRow>
            </div>
          </FormSection>
        )}
      </StepLayout>

      <AlertDialog
        open={alert !== null}
        onClose={() => setAlert(null)}
        title="회원가입 안내"
        messages={alert ? [alert] : []}
      />
    </>
  )
}
