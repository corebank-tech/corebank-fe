import { useLocation, useNavigate } from "react-router"
import { Button } from "@/shared/ui/button"
import { StepLayout } from "@/shared/ui/step-layout"
import { ResultPanel } from "@/widgets/transfer"
import { type DataGridColumn } from "@/shared/ui/data-grid"
import { formatAccountNo, formatAmount, formatDate } from "@/shared/lib/format"
import {
  PRODUCT_JOIN_STEPS,
  type ProductJoinResult,
} from "@/pages/product/join-shared"

type JoinResultRow = {
  newAccountNo: string
  productName: string
  amount: number
  termMonths: number
  maturityDate: string
  rate: number
}

const resultColumns: DataGridColumn<JoinResultRow>[] = [
  {
    key: "newAccountNo",
    header: "신규계좌번호",
    align: "center",
    render: (r) => <span>{formatAccountNo(r.newAccountNo)}</span>,
  },
  { key: "productName", header: "상품명", align: "center" },
  {
    key: "amount",
    header: "가입금액(원)",
    align: "right",
    render: (r) => <span>{formatAmount(r.amount, { suffix: false })}</span>,
  },
  {
    key: "termMonths",
    header: "가입기간",
    align: "center",
    render: (r) => `${r.termMonths}개월`,
  },
  {
    key: "maturityDate",
    header: "만기일",
    align: "center",
    render: (r) => formatDate(r.maturityDate),
  },
  {
    key: "rate",
    header: "적용금리(%)",
    align: "right",
    render: (r) => (
      <span className="font-bold text-primary">{r.rate.toFixed(2)}</span>
    ),
  },
]

/** C-06 상품가입 4단계 · 완료 (REQ-PRDT-013, REQ-PRDT-016) */
export const C06Complete = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const result = location.state as ProductJoinResult | null

  if (!result) {
    return (
      <StepLayout steps={PRODUCT_JOIN_STEPS} currentStep={4} title="상품가입">
        <p className="py-10 text-center text-base text-ink-muted">
          가입 정보를 확인할 수 없습니다. 상품가입을 처음부터 다시 진행하세요.
        </p>
      </StepLayout>
    )
  }

  const title = `${result.productName} 가입`

  const row: JoinResultRow = {
    newAccountNo: result.newAccountNo,
    productName: result.productName,
    amount: result.amount,
    termMonths: result.termMonths,
    maturityDate: result.maturityDate,
    rate: result.rate,
  }

  // REQ-PRDT-016: G-01 진입 시 입금계좌·이체금액·이체주기(1개월)·이체종료일(적금 만기일)을 미리 채운다.
  const autoTransferSearch = new URLSearchParams({
    toAccount: result.newAccountNo,
    amount: String(result.amount),
    cycleMonths: "1",
    endDate: result.maturityDate,
  }).toString()

  return (
    <StepLayout steps={PRODUCT_JOIN_STEPS} currentStep={4} title={title}>
      <ResultPanel
        variant="success"
        message="상품가입이 완료되었습니다."
        description="신규 계좌는 계좌조회에서 즉시 확인할 수 있습니다."
        highlightLabel="가입금액"
        highlightValue={formatAmount(result.amount)}
        columns={resultColumns}
        row={row}
        gridHoverable={false}
        footnote="※ 예적금 계좌는 계좌비밀번호를 별도로 부여하지 않습니다."
        actions={
          <>
            <Button
              variant="secondary"
              size="lg"
              className="min-w-40"
              onClick={() => navigate("/accounts")}
            >
              계좌조회로 이동
            </Button>
            {result.category === "정기적금" && (
              <Button
                variant="primary"
                size="lg"
                className="min-w-40"
                onClick={() =>
                  navigate(`/transfer/auto/new?${autoTransferSearch}`)
                }
              >
                자동이체 등록
              </Button>
            )}
          </>
        }
      />
    </StepLayout>
  )
}
