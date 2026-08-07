import * as React from "react"
import { useLocation, useNavigate, useParams } from "react-router"
import { Button } from "@/shared/ui/button"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { StepLayout } from "@/shared/ui/step-layout"
import { WithdrawAccountField } from "@/widgets/transfer"
import { TermMonthsField, JoinAmountField } from "@/pages/product/fields"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { formatKoreanAmount } from "@/shared/lib/format"
import { estimateMaturityAmount } from "@/entities/product"
import { MOCK_JOIN_ACCOUNTS, MOCK_JOIN_PRODUCTS } from "@/entities/product"
import {
  PRODUCT_JOIN_STEPS,
  type ProductJoinFormState,
} from "@/pages/product/join-shared"

/** C-04 상품가입 2단계 · 정보입력 (REQ-PRDT-006~009) */
export const C04InputInfo = () => {
  const { productId = "P001" } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const product = MOCK_JOIN_PRODUCTS[productId] ?? MOCK_JOIN_PRODUCTS.P001
  const prev = location.state as ProductJoinFormState | null

  const [termMonths, setTermMonths] = React.useState<number | null>(
    prev?.termMonths ?? null,
  )
  const [fromAccount, setFromAccount] = React.useState(
    prev?.fromAccount ?? MOCK_JOIN_ACCOUNTS[0].accountNo,
  )
  const [amount, setAmount] = React.useState<number | null>(
    prev?.amount ?? null,
  )

  const selectedAccount = MOCK_JOIN_ACCOUNTS.find(
    (a) => a.accountNo === fromAccount,
  )
  const amountLabel =
    product.category === "정기적금"
      ? "가입금액(월납입금액)"
      : "가입금액(일시납입액)"

  const termValid =
    termMonths != null &&
    termMonths >= product.minTermMonths &&
    termMonths <= product.maxTermMonths
  const amountValid =
    amount != null &&
    amount >= product.minAmount &&
    amount <= product.maxAmount &&
    // 정기예금만 출금가능금액을 검증한다(REQ-PRDT-008). 정기적금은 가입 시점에 출금이 발생하지 않는다.
    (product.category === "정기적금" ||
      (selectedAccount != null && amount <= selectedAccount.withdrawable))

  const canSubmit = termValid && amountValid && fromAccount !== ""

  const expectedMaturity =
    amount != null && termMonths != null
      ? estimateMaturityAmount({
          category: product.category,
          amount,
          termMonths,
          annualRatePercent: product.rate,
        })
      : null

  const handleNext = () => {
    const next: ProductJoinFormState = { termMonths, fromAccount, amount }
    navigate(`/product/${product.id}/join/3`, { state: next })
  }

  return (
    <>
      <StepLayout
        steps={PRODUCT_JOIN_STEPS}
        currentStep={2}
        title={`${product.name} 가입`}
        notice={[
          "가입기간과 가입금액은 상품별 허용 범위 내에서만 입력할 수 있습니다.",
          "예적금 계좌는 별도의 계좌비밀번호를 사용하지 않으므로 이 단계에서 입력받지 않습니다.",
        ]}
        footer={
          <Button
            variant="primary"
            size="lg"
            className="min-w-40"
            disabled={!canSubmit}
            onClick={handleNext}
          >
            다음
          </Button>
        }
      >
        <FormSection title="가입정보 입력">
          <div>
            <FormRow
              label="가입기간"
              required
              htmlFor="c04-term"
              labelWidth={220}
            >
              <TermMonthsField
                id="c04-term"
                value={termMonths}
                onChange={setTermMonths}
                min={product.minTermMonths}
                max={product.maxTermMonths}
              />
            </FormRow>
            <FormRow
              label="출금계좌"
              required
              htmlFor="c04-account"
              labelWidth={220}
            >
              <WithdrawAccountField
                id="c04-account"
                options={MOCK_JOIN_ACCOUNTS}
                value={fromAccount}
                onChange={setFromAccount}
              />
            </FormRow>
            <FormRow
              label={amountLabel}
              required
              htmlFor="c04-amount"
              labelWidth={220}
            >
              <JoinAmountField
                id="c04-amount"
                value={amount}
                onChange={setAmount}
                min={product.minAmount}
                max={product.maxAmount}
                withdrawable={
                  product.category === "정기예금"
                    ? selectedAccount?.withdrawable
                    : undefined
                }
              />
            </FormRow>
            <FormRow label="만기 시 처리방법" labelWidth={220}>
              <div className="flex flex-col gap-1">
                <span className="text-base font-bold text-ink">
                  만기해지(원리금 지급)
                </span>
                <p className="text-2xs text-ink-faint">
                  ※ 재예치는 제공하지 않습니다.
                </p>
              </div>
            </FormRow>
          </div>
        </FormSection>

        <FormSection title="예상 만기금액(참고)">
          <div className="border border-border bg-surface px-5 py-4">
            <p className="text-2xs text-ink-faint">세전 단리 기준 참고값</p>
            <p className="mt-1 text-page font-bold text-primary">
              {expectedMaturity != null
                ? formatKoreanAmount(expectedMaturity)
                : "-"}
            </p>
            <p className="mt-2 text-2xs text-ink-muted">
              ※ 실제 지급액은 적용금리 변경, 중도해지 등의 사유로 위 참고값과
              다를 수 있습니다.
            </p>
          </div>
        </FormSection>
      </StepLayout>

      <NoticeBoxFooter
        className="mt-8"
        items={[
          "가입금액·가입기간이 허용 범위를 벗어나면 다음 단계로 진행할 수 없습니다.",
          "정기예금은 출금계좌의 출금가능금액 이상으로 가입할 수 없습니다.",
        ]}
      />
    </>
  )
}
