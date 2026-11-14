import * as React from "react"
import { useNavigate, useParams } from "react-router"
import { Button } from "@/shared/ui/button"
import { Checkbox } from "@/shared/ui/checkbox"
import { ConfirmSummary } from "@/shared/ui/confirm-summary"
import { EmptyState } from "@/shared/ui/empty-state"
import { FormSection } from "@/shared/ui/form-section"
import { LabelValueRow } from "@/shared/ui/label-value-row"
import { StepLayout } from "@/shared/ui/step-layout"
import { toErrorMessage } from "@/shared/api/api-error"
import { formatAmount, formatDateTime } from "@/shared/lib/format"
import {
  parseDepositTerminationKind,
  toDepositTerminationPreview,
  useDepositTerminationPreviewQuery,
  useOverviewAccount,
  type DepositTerminationKind,
  DEPOSIT_ACCOUNTS_PATH,
  getDepositTerminationPath,
} from "@/entities/account"
import {
  describeAccount,
  TERMINATION_LABELS,
  TERMINATION_STEPS,
  type TerminationConfirmedState,
} from "@/pages/deposit-termination/termination-shared"

const TERMINATION_NOTICES: Record<DepositTerminationKind, string[]> = {
  maturity: [
    "만기해지 시 원리금이 가입 시 지정한 계좌로 지급되고 상품 계좌가 종료됩니다.",
    "예상 지급액은 확정 금액이 아니며 실제 해지 시 달라질 수 있습니다.",
  ],
  early: [
    "아직 만기 전입니다. 중도해지이율이 적용되어 이자가 줄어들 수 있고 해지 후 복구할 수 없습니다.",
    "예상 지급액은 확정 금액이 아니며 실제 해지 시 달라질 수 있습니다.",
  ],
}

/** 예·적금 해지 1단계 · 예상 지급액 확인 */
export const TerminationPreview = () => {
  const { accountId: accountIdParam, kind: kindParam } = useParams()
  const accountId = Number(accountIdParam)
  const kind = parseDepositTerminationKind(kindParam)

  if (kind == null || !Number.isInteger(accountId) || accountId <= 0) {
    return <InvalidTerminationAccess />
  }

  return <TerminationPreviewBody accountId={accountId} kind={kind} />
}

const InvalidTerminationAccess = () => {
  const navigate = useNavigate()

  return (
    <EmptyState
      message="해지할 계좌를 확인할 수 없습니다."
      description="예·적금 계좌목록에서 다시 선택하세요."
      action={
        <Button
          variant="primary"
          size="lg"
          className="min-w-40"
          onClick={() => navigate(DEPOSIT_ACCOUNTS_PATH)}
        >
          예·적금 계좌목록
        </Button>
      }
    />
  )
}

type TerminationPreviewBodyProps = {
  accountId: number
  kind: DepositTerminationKind
}

const TerminationPreviewBody = ({
  accountId,
  kind,
}: TerminationPreviewBodyProps) => {
  const navigate = useNavigate()
  const [isCautionChecked, setIsCautionChecked] = React.useState(false)
  const label = TERMINATION_LABELS[kind]

  const { account: productAccount } = useOverviewAccount(accountId)
  const previewQuery = useDepositTerminationPreviewQuery(accountId, kind)
  const preview = toDepositTerminationPreview(previewQuery.data)
  const { account: withdrawalAccount } = useOverviewAccount(
    preview?.withdrawalAccountId,
  )

  if (previewQuery.isLoading) {
    return (
      <div className="py-20 text-center text-ink-muted">
        예상 지급액을 불러오는 중입니다.
      </div>
    )
  }

  if (previewQuery.isError || preview == null) {
    return (
      <EmptyState
        message={`${label} 예상 지급액을 불러오지 못했습니다.`}
        description={
          previewQuery.isError
            ? toErrorMessage(previewQuery.error)
            : "예상 지급액 정보가 올바르지 않아 해지를 진행할 수 없습니다."
        }
        action={
          <Button
            variant="primary"
            size="lg"
            className="min-w-40"
            onClick={() => navigate(DEPOSIT_ACCOUNTS_PATH)}
          >
            예·적금 계좌목록
          </Button>
        }
      />
    )
  }

  const needsCaution = kind === "early"
  const canProceed = !needsCaution || isCautionChecked
  const confirmedState: TerminationConfirmedState = { confirmed: true }

  return (
    <StepLayout
      steps={TERMINATION_STEPS}
      currentStep={1}
      title={`예·적금 ${label}`}
      notice={TERMINATION_NOTICES[kind]}
      footer={
        <>
          <Button
            variant="secondary"
            size="lg"
            className="min-w-30"
            onClick={() => navigate(DEPOSIT_ACCOUNTS_PATH)}
          >
            이전
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="min-w-40"
            disabled={!canProceed}
            onClick={() =>
              navigate(getDepositTerminationPath(accountId, kind, 2), {
                state: confirmedState,
              })
            }
          >
            다음
          </Button>
        </>
      }
    >
      <FormSection title="해지 계좌">
        <LabelValueRow
          label="상품 계좌"
          value={describeAccount(productAccount)}
        />
        <LabelValueRow
          label="수취 계좌"
          value={describeAccount(withdrawalAccount)}
        />
        <LabelValueRow
          label="계산 기준일시"
          value={formatDateTime(preview.calculatedAt)}
        />
      </FormSection>

      <FormSection title="예상 지급액">
        <ConfirmSummary
          columns={[
            {
              label: "원금(원)",
              value: formatAmount(preview.principal, { suffix: false }),
            },
            {
              label: "세전이자(원)",
              value: formatAmount(preview.grossInterest, { suffix: false }),
            },
            {
              label: "세금(원)",
              value: formatAmount(preview.tax, { suffix: false }),
            },
            {
              label: "세후이자(원)",
              value: formatAmount(preview.netInterest, { suffix: false }),
            },
            {
              label: "예상 지급액(원)",
              value: formatAmount(preview.totalExpectedAmount, {
                suffix: false,
              }),
              emphasis: true,
            },
          ]}
        />
      </FormSection>

      {needsCaution && (
        <Checkbox
          checked={isCautionChecked}
          onChange={(event) => setIsCautionChecked(event.target.checked)}
          label="중도해지이율 적용과 해지 후 복구할 수 없음을 확인했습니다."
        />
      )}
    </StepLayout>
  )
}
