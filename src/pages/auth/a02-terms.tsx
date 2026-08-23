import * as React from "react"
import { Button } from "@/shared/ui/button"
import { StepLayout } from "@/shared/ui/step-layout"
import { TermsAgreement, type TermsAgreementHandle } from "@/widgets"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { SIGNUP_STEPS } from "@/pages/auth/signup-shared"
import { Alert } from "@/shared/ui/alert"
import { AlertDialog } from "@/shared/ui/alert-dialog"
import {
  useCheckSignupTermsMutation,
  useSignupTermsQuery,
} from "@/entities/auth"
import { isApiError } from "@/shared/api/api-error"
import type { TermItem } from "@/shared/types/term"

type A02TermsProps = {
  onNext: (termsAuthToken: string) => void
}

const getErrorMessage = (error: unknown): string => {
  if (isApiError(error)) return error.message
  if (error instanceof Error) return error.message
  return "요청 처리 중 오류가 발생했습니다."
}

/** A-02 회원가입 1단계 · 약관동의 (REQ-AUTH-003·004) */
export const A02Terms = ({ onNext }: A02TermsProps) => {
  const termsRef = React.useRef<TermsAgreementHandle>(null)

  const termsQuery = useSignupTermsQuery()
  const checkTermsMutation = useCheckSignupTermsMutation()

  const [allRequiredAgreed, setAllRequiredAgreed] = React.useState(false)

  const [agreedIds, setAgreedIds] = React.useState<string[]>([])
  const [alert, setAlert] = React.useState<string | null>(null)

  const terms = React.useMemo<TermItem[]>(
    () =>
      (termsQuery.data?.items ?? []).flatMap((term) => {
        if (!term.termsId || !term.title) return []

        return [
          {
            id: term.termsId,
            required: term.isRequired ?? false,
            title: term.title,
            question: `${term.title}에 동의합니다.`,
            body: term.content ?? "",
          },
        ]
      }),
    [termsQuery.data?.items],
  )

  const handleNext = async () => {
    if (!termsRef.current?.validateProceed()) return

    const agreedTerms = (termsQuery.data?.items ?? []).flatMap((term) => {
      const termsId = term.termsId
      const version = term.version

      if (!termsId || !version || !agreedIds.includes(termsId)) {
        return []
      }
      return [
        {
          termsId,
          version,
          isAgreed: true,
          isRead: true,
        },
      ]
    })

    try {
      const result = await checkTermsMutation.mutateAsync({
        agreedTerms,
      })

      if (!result.termsAuthToken) {
        setAlert("약관 인증 토큰을 발급받지 못했습니다.")
        return
      }

      onNext(result.termsAuthToken)
    } catch (error) {
      setAlert(getErrorMessage(error))
    }
  }
  const queryErrorMessage = termsQuery.isError
    ? getErrorMessage(termsQuery.error)
    : null

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
            disabled={
              termsQuery.isPending ||
              termsQuery.isError ||
              terms.length === 0 ||
              checkTermsMutation.isPending
            }
            onClick={handleNext}
          >
            {checkTermsMutation.isPending ? "처리 중..." : "다음"}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {termsQuery.isPending && (
            <Alert variant="info">약관을 불러오는 중입니다.</Alert>
          )}

          {queryErrorMessage && (
            <Alert variant="danger">{queryErrorMessage}</Alert>
          )}

          {termsQuery.isSuccess && terms.length === 0 && (
            <Alert variant="warning">표시할 회원가입 약관이 없습니다.</Alert>
          )}

          {terms.length > 0 && (
            <TermsAgreement
              ref={termsRef}
              terms={terms}
              onAllRequiredAgreedChange={setAllRequiredAgreed}
              onAgreedChange={setAgreedIds}
            />
          )}

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
          "회원가입은 서비스 이용약관, 개인정보 수집·이용 동의서 2종에 모두 동의해야 진행할 수 있습니다.",
          "다음 단계에서는 본인 명의의 당행 계좌로 실명을 확인합니다.",
        ]}
      />
      <AlertDialog
        open={alert !== null}
        onClose={() => setAlert(null)}
        title="약관 동의 안내"
        messages={alert ? [alert] : []}
      />
    </>
  )
}
