import * as React from "react"
import { useLocation, useNavigate, useParams } from "react-router"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/shared/ui/button"
import { ConfirmSummary } from "@/shared/ui/confirm-summary"
import { EmptyState } from "@/shared/ui/empty-state"
import { ErrorDialog } from "@/shared/ui/error-dialog"
import { FormSection } from "@/shared/ui/form-section"
import { StepLayout } from "@/shared/ui/step-layout"
import { ApiError, NETWORK_ERROR_CODE } from "@/shared/api/api-error"
import { useIdempotencyKey } from "@/shared/lib/hooks/use-idempotency-key"
import { AccountPasswordField } from "@/widgets/transfer"
import {
  invalidateAccountQueries,
  parseDepositTerminationKind,
  useAccountPasswordVerification,
  useOverviewAccount,
  useTerminateDepositMutation,
  type DepositTerminationKind,
  DEPOSIT_ACCOUNTS_PATH,
  getDepositTerminationPath,
} from "@/entities/account"
import {
  describeAccount,
  TERMINATION_LABELS,
  TERMINATION_STEPS,
  type TerminationCompleteState,
  type TerminationConfirmedState,
} from "@/pages/deposit-termination/termination-shared"

const PASSWORD_LIMIT = 4

const UNCONFIRMED_MESSAGE =
  "해지 결과를 확인하지 못했습니다. 예·적금 계좌목록에서 계좌 상태를 확인한 뒤 다시 시도하세요."

/**
 * 해지가 끝나지 못한 이유. 서버가 거절한 건과 응답을 받지 못한 건을 한 state 로 묶어
 * 제목과 문구가 따로 갈리지 않게 한다 — 결과를 모르는 건을 "실패" 로 단정하면 고객이
 * 끝난 해지를 안 끝난 것으로 읽는다.
 */
type TerminationFailure = { title: string; message: string }

/** 예·적금 해지 2단계 · 상품 계좌 비밀번호 인증과 해지 확정 */
export const TerminationAuth = () => {
  const { accountId: accountIdParam, kind: kindParam } = useParams()
  const location = useLocation()
  const accountId = Number(accountIdParam)
  const kind = parseDepositTerminationKind(kindParam)
  const confirmed = (location.state as TerminationConfirmedState | null)
    ?.confirmed

  if (kind == null || !Number.isInteger(accountId) || accountId <= 0) {
    return <TerminationRestartNotice to={DEPOSIT_ACCOUNTS_PATH} />
  }

  if (confirmed !== true) {
    return (
      <TerminationRestartNotice
        to={getDepositTerminationPath(accountId, kind, 1)}
      />
    )
  }

  return <TerminationAuthBody accountId={accountId} kind={kind} />
}

const TerminationRestartNotice = ({ to }: { to: string }) => {
  const navigate = useNavigate()

  return (
    <EmptyState
      message="해지 정보를 확인할 수 없습니다."
      description="예상 지급액 확인부터 다시 진행하세요."
      action={
        <Button
          variant="primary"
          size="lg"
          className="min-w-40"
          onClick={() => navigate(to)}
        >
          처음으로
        </Button>
      }
    />
  )
}

type TerminationAuthBodyProps = {
  accountId: number
  kind: DepositTerminationKind
}

const TerminationAuthBody = ({ accountId, kind }: TerminationAuthBodyProps) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const idempotency = useIdempotencyKey()
  const label = TERMINATION_LABELS[kind]

  const [password, setPassword] = React.useState("")
  const [passwordError, setPasswordError] = React.useState<string | null>(null)
  const [failure, setFailure] = React.useState<TerminationFailure | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const { account: productAccount } = useOverviewAccount(accountId)
  const { verify } = useAccountPasswordVerification()
  const terminateMutation = useTerminateDepositMutation()

  const executeTermination = async (accountPasswordAuthToken: string) => {
    try {
      const result = await terminateMutation.mutateAsync({
        kind,
        accountId,
        accountPasswordAuthToken,
        idempotencyKey: idempotency.keyFor({ accountId, kind }),
      })

      idempotency.reset()
      const completeState: TerminationCompleteState = { result }
      // 뒤로 가기로 인증 단계가 다시 열려 이미 끝난 해지를 재요청하지 않도록 이력을 바꾼다.
      navigate(getDepositTerminationPath(accountId, kind, 3), {
        state: completeState,
        replace: true,
      })
    } catch (error) {
      // 응답을 받지 못한 요청은 서버가 처리했는지 알 수 없어 키를 유지한 채 재시도하게 둔다.
      // 서버가 거절한 요청은 처리되지 않았으므로 다음 시도는 새 거래다.
      const isRejected =
        error instanceof ApiError && error.code !== NETWORK_ERROR_CODE
      if (isRejected) idempotency.reset()
      setFailure(
        isRejected
          ? { title: `${label} 실패`, message: error.message }
          : { title: `${label} 결과 확인 필요`, message: UNCONFIRMED_MESSAGE },
      )
    } finally {
      terminateMutation.reset()
      void invalidateAccountQueries(queryClient)
    }
  }

  /**
   * 비밀번호 검증과 해지 실행을 한 번의 확정으로 묶는다. 인증 토큰은 일회용이라
   * 상태에 남기지 않고 이 함수 안에서만 들고 있다.
   */
  const handleTerminate = async () => {
    if (isSubmitting) return

    if (password.length !== PASSWORD_LIMIT) {
      setPasswordError("상품 계좌 비밀번호 4자리를 모두 입력하세요.")
      return
    }

    setPasswordError(null)
    setIsSubmitting(true)

    try {
      const verification = await verify({
        accountId,
        accountPassword: password,
        clearPassword: () => setPassword(""),
      })

      if (!verification.ok) {
        setPasswordError(verification.message)
        return
      }

      await executeTermination(verification.token)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <StepLayout
        steps={TERMINATION_STEPS}
        currentStep={2}
        title={`예·적금 ${label}`}
        notice={[
          "상품 계좌 비밀번호를 인증하면 바로 해지가 실행되며, 실행 후에는 취소할 수 없습니다.",
        ]}
        footer={
          <>
            <Button
              variant="secondary"
              size="lg"
              className="min-w-30"
              disabled={isSubmitting}
              onClick={() =>
                navigate(getDepositTerminationPath(accountId, kind, 1))
              }
            >
              이전
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="min-w-40"
              disabled={isSubmitting}
              onClick={handleTerminate}
            >
              {isSubmitting ? "해지 처리 중..." : `${label}하기`}
            </Button>
          </>
        }
      >
        <FormSection title="해지 내용 확인">
          <ConfirmSummary
            columns={[
              { label: "해지 유형", value: label },
              {
                label: "상품 계좌",
                value: describeAccount(productAccount),
                emphasis: true,
              },
            ]}
          />
        </FormSection>

        <FormSection title="상품 계좌 비밀번호 인증">
          <div className="flex flex-col gap-2">
            <AccountPasswordField
              id="termination-password"
              value={password}
              onChange={(value) => {
                setPassword(value)
                if (passwordError) setPasswordError(null)
              }}
            />
            {passwordError && (
              <p role="alert" className="text-xs font-bold text-danger">
                {passwordError}
              </p>
            )}
          </div>
        </FormSection>
      </StepLayout>

      <ErrorDialog
        open={failure != null}
        onClose={() => setFailure(null)}
        title={failure?.title ?? ""}
        messages={failure ? [failure.message] : []}
      />
    </>
  )
}
