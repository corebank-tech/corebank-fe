import { useLocation, useNavigate, useParams } from "react-router"
import { Button } from "@/shared/ui/button"
import { EmptyState } from "@/shared/ui/empty-state"
import { StepLayout } from "@/shared/ui/step-layout"
import type { DataGridColumn } from "@/shared/ui/data-grid"
import { formatAmount, formatDate } from "@/shared/lib/format"
import { ResultPanel } from "@/widgets/transfer"
import {
  parseDepositTerminationKind,
  useOverviewAccount,
  type DepositTerminationResult,
  DEPOSIT_ACCOUNTS_PATH,
} from "@/entities/account"
import {
  describeAccount,
  TERMINATION_LABELS,
  TERMINATION_STEPS,
  type TerminationCompleteState,
} from "@/pages/deposit-termination/termination-shared"

const formatOptionalAmount = (amount: number | undefined) =>
  amount == null ? "-" : formatAmount(amount, { suffix: false })

const resultColumns: DataGridColumn<DepositTerminationResult>[] = [
  {
    key: "principal",
    header: "원금(원)",
    align: "right",
    render: (r) => formatOptionalAmount(r.principal),
  },
  {
    key: "grossInterest",
    header: "세전이자(원)",
    align: "right",
    render: (r) => formatOptionalAmount(r.grossInterest),
  },
  {
    key: "tax",
    header: "세금(원)",
    align: "right",
    render: (r) => formatOptionalAmount(r.tax),
  },
  {
    key: "netInterest",
    header: "세후이자(원)",
    align: "right",
    render: (r) => formatOptionalAmount(r.netInterest),
  },
  {
    key: "tradeDate",
    header: "해지일",
    align: "center",
    render: (r) => (r.tradeDate ? formatDate(r.tradeDate) : "-"),
  },
  {
    key: "transactionNumber",
    header: "거래번호",
    align: "center",
    render: (r) => r.transactionNumber ?? "-",
  },
]

/** 예·적금 해지 3단계 · 완료 */
export const TerminationComplete = () => {
  const { kind: kindParam } = useParams()
  const location = useLocation()
  const kind = parseDepositTerminationKind(kindParam)
  const result = (location.state as TerminationCompleteState | null)?.result

  if (kind == null || result == null) {
    return <TerminationCompleteMissing />
  }

  return (
    <TerminationCompleteBody result={result} label={TERMINATION_LABELS[kind]} />
  )
}

const TerminationCompleteMissing = () => {
  const navigate = useNavigate()

  return (
    <EmptyState
      message="해지 결과를 확인할 수 없습니다."
      description="예·적금 계좌목록에서 계좌 상태를 확인하세요."
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

type TerminationCompleteBodyProps = {
  result: DepositTerminationResult
  label: string
}

const TerminationCompleteBody = ({
  result,
  label,
}: TerminationCompleteBodyProps) => {
  const navigate = useNavigate()
  const { account: withdrawalAccount } = useOverviewAccount(
    result.withdrawalAccountId,
  )

  return (
    <StepLayout
      steps={TERMINATION_STEPS}
      currentStep={3}
      title={`예·적금 ${label}`}
    >
      <ResultPanel
        variant="success"
        message={`${label}가 완료되었습니다.`}
        description={
          withdrawalAccount == null
            ? "가입 시 지정한 수취 계좌로 입금되었습니다."
            : `수취 계좌 ${describeAccount(withdrawalAccount)}로 입금되었습니다.`
        }
        highlightLabel="실제 지급액"
        highlightValue={
          result.totalTransferred == null
            ? "-"
            : formatAmount(result.totalTransferred)
        }
        columns={resultColumns}
        row={result}
        gridHoverable={false}
        actions={
          <>
            <Button
              variant="secondary"
              size="lg"
              className="min-w-40"
              onClick={() => navigate(DEPOSIT_ACCOUNTS_PATH)}
            >
              예·적금 계좌목록
            </Button>
            {result.withdrawalAccountId != null && (
              <Button
                variant="primary"
                size="lg"
                className="min-w-40"
                onClick={() =>
                  navigate(`/inquiry?accountId=${result.withdrawalAccountId}`)
                }
              >
                입금계좌 거래내역 보기
              </Button>
            )}
          </>
        }
      />
    </StepLayout>
  )
}
