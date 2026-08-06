import * as React from "react"
import { useLocation, useNavigate, useParams } from "react-router"
import { Button } from "@/shared/ui/button"
import { FormSection } from "@/shared/ui/form-section"
import { StepLayout } from "@/shared/ui/step-layout"
import { ConfirmSummary } from "@/shared/ui/confirm-summary"
import { AccountPasswordField } from "@/widgets/transfer"
import { OtpModal } from "@/entities/auth"
import { ErrorDialog } from "@/shared/ui/error-dialog"
import {
  formatAccountNo,
  formatAmount,
  formatDate,
  formatKoreanAmount,
} from "@/shared/lib/format"
import {
  addMonthsWithEomCorrection,
  estimateMaturityAmount,
} from "@/entities/product"
import {
  JOIN_DATE,
  MOCK_JOIN_ACCOUNTS,
  MOCK_JOIN_PRODUCTS,
} from "@/entities/product"
import {
  PRODUCT_JOIN_STEPS,
  type ProductJoinFormState,
  type ProductJoinResult,
} from "@/pages/product/join-shared"
import { ACCOUNT_PASSWORD_ERROR_LIMIT as ERROR_LIMIT } from "@/shared/config/policy"

const PASSWORD_LIMIT = 4

/** C-05 상품가입 3단계 · 확인 및 인증 (REQ-PRDT-010, REQ-ACCT-007) */
export const C05ConfirmAuth = () => {
  const { productId = "P001" } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const product = MOCK_JOIN_PRODUCTS[productId] ?? MOCK_JOIN_PRODUCTS.P001

  const form = (location.state as ProductJoinFormState | null) ?? {
    termMonths: product.minTermMonths,
    fromAccount: MOCK_JOIN_ACCOUNTS[0].accountNo,
    amount: product.minAmount,
  }

  const account =
    MOCK_JOIN_ACCOUNTS.find((a) => a.accountNo === form.fromAccount) ??
    MOCK_JOIN_ACCOUNTS[0]
  const termMonths = form.termMonths ?? product.minTermMonths
  const amount = form.amount ?? product.minAmount

  const maturityDate = addMonthsWithEomCorrection(JOIN_DATE, termMonths)
  const expectedMaturity = estimateMaturityAmount({
    category: product.category,
    amount,
    termMonths,
    annualRatePercent: product.rate,
  })

  const [password, setPassword] = React.useState("")
  const [passwordError, setPasswordError] = React.useState<string | null>(null)
  const [errorCount, setErrorCount] = React.useState(0)
  const [otpOpen, setOtpOpen] = React.useState(false)
  const [blockedDialog, setBlockedDialog] = React.useState(false)

  const blocked = errorCount >= ERROR_LIMIT

  const handleAuthenticate = () => {
    if (password.length !== PASSWORD_LIMIT) {
      setPasswordError("계좌비밀번호 4자리를 모두 입력하세요.")
      return
    }
    if (password !== account.mockPassword) {
      const next = errorCount + 1
      setErrorCount(next)
      setPassword("")
      if (next >= ERROR_LIMIT) {
        setBlockedDialog(true)
      } else {
        setPasswordError(
          `계좌비밀번호가 일치하지 않습니다. 누적 오류 횟수 ${next}회 (5회 도달 시 거래정지됩니다.)`,
        )
      }
      return
    }
    setPasswordError(null)
    setOtpOpen(true)
  }

  const handleOtpConfirm = () => {
    setOtpOpen(false)
    const result: ProductJoinResult = {
      productId: product.id,
      productName: product.name,
      category: product.category,
      newAccountNo: product.mockNewAccountNo,
      amount,
      termMonths,
      maturityDate,
      rate: product.rate,
    }
    navigate(`/product/${product.id}/join/4`, { state: result })
  }

  return (
    <>
      <StepLayout
        steps={PRODUCT_JOIN_STEPS}
        currentStep={3}
        title={`${product.name} 가입`}
        notice={[
          "아래 가입 내용을 확인한 뒤 계좌비밀번호와 OTP 인증을 완료하면 가입이 실행됩니다.",
          "인증 완료 후에는 가입 내용을 취소할 수 없습니다.",
        ]}
        footer={
          <>
            <Button
              variant="secondary"
              size="lg"
              className="min-w-30"
              onClick={() => navigate(-1)}
            >
              이전
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="min-w-40"
              disabled={blocked}
              onClick={handleAuthenticate}
            >
              인증하고 가입하기
            </Button>
          </>
        }
      >
        <FormSection title="가입내용 확인">
          <ConfirmSummary
            columns={[
              { label: "상품명", value: product.name },
              { label: "가입유형", value: product.category },
              { label: "가입기간", value: `${termMonths}개월` },
              {
                label:
                  product.category === "정기적금"
                    ? "월납입금액(원)"
                    : "가입금액(원)",
                value: formatAmount(amount, { suffix: false }),
                emphasis: true,
              },
              {
                label: "출금계좌",
                value: `${account.alias} ${formatAccountNo(account.accountNo)}`,
              },
              { label: "만기예정일", value: formatDate(maturityDate) },
            ]}
          />
          <p className="mt-2 text-2xs text-ink-faint">
            ※ 예상 만기금액(세전 단리 참고값){" "}
            {formatKoreanAmount(expectedMaturity)} · 실제 지급액과 다를 수
            있습니다.
          </p>
        </FormSection>

        <FormSection title="계좌비밀번호 인증">
          <div className="flex flex-col gap-2">
            <AccountPasswordField
              id="c05-password"
              value={password}
              onChange={(v) => {
                setPassword(v)
                if (passwordError) setPasswordError(null)
              }}
            />
            {passwordError && (
              <p role="alert" className="text-xs font-bold text-danger">
                {passwordError}
              </p>
            )}
            {blocked && (
              <p className="text-xs font-bold text-danger">
                오류 횟수를 초과해 이 계좌가 거래정지되었습니다. 영업점 또는
                고객센터에서 해제 후 다시 시도하세요.
              </p>
            )}
          </div>
        </FormSection>
      </StepLayout>

      <OtpModal
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        onConfirm={handleOtpConfirm}
        title="상품가입 OTP 인증"
        guide="OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하면 가입이 실행됩니다."
      />

      <ErrorDialog
        open={blockedDialog}
        onClose={() => setBlockedDialog(false)}
        title="계좌비밀번호 오류"
        messages={[
          "계좌비밀번호를 5회 연속 잘못 입력해 이 계좌가 거래정지 상태로 전환되었습니다.",
          "거래정지 해제는 영업점 또는 고객센터에서 처리할 수 있습니다.",
        ]}
      />
    </>
  )
}
