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
import {
  estimateMaturityAmount,
  getAppliedRateForTerm,
  getProductTermRange,
  toProductDetailData,
  useProductDetail,
  useValidateSubscription,
  type ViolationItem,
} from "@/entities/product"
import {
  PRODUCT_JOIN_STEPS,
  type ProductJoinFormState,
} from "@/pages/product/join-shared"
import { Alert } from "@/shared/ui/alert"
import { EmptyState } from "@/shared/ui/empty-state"
import { ApiError } from "@/shared/api/api-error"
import { useWithdrawAccounts } from "@/entities/account"
import type { AccountOption } from "@/shared/types/account"

/** C-04 상품가입 2단계 · 정보입력 (REQ-PRDT-006~009) */
export const C04InputInfo = () => {
  const { productId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const id = Number(productId)
  const { detail, isLoading, isError } = useProductDetail(id)
  const prev = location.state as ProductJoinFormState | null

  const [termMonths, setTermMonths] = React.useState<number | null>(
    prev?.termMonths ?? null,
  )
  const [fromAccountNo, setFromAccountNo] = React.useState(
    prev?.fromAccountNo ?? "",
  )
  const [amount, setAmount] = React.useState<number | null>(
    prev?.amount ?? null,
  )

  const { accounts: withdrawAccounts } = useWithdrawAccounts()

  const validateMutation = useValidateSubscription()
  const [violations, setViolations] = React.useState<ViolationItem[]>([])
  const [validateError, setValidateError] = React.useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="py-20 text-center text-ink-muted">불러오는 중...</div>
    )
  }

  if (isError || !detail) {
    return (
      <EmptyState
        message="상품을 찾을 수 없습니다."
        description={`상품ID: ${productId}`}
      />
    )
  }

  const product = toProductDetailData(detail)
  const { minTermMonths, maxTermMonths } = getProductTermRange(detail)

  const accountOptions: AccountOption[] = withdrawAccounts.map((a) => ({
    alias: a.accountName ?? "",
    accountNo: a.accountNumber ?? "",
    balance: a.balance ?? 0,
    withdrawable: a.balance ?? 0,
  }))

  // 계좌 목록은 비동기로 도착하므로, 아직 고르지 않았다면 첫 계좌를 렌더링 중에
  // 파생값으로 기본 선택한다(useEffect + setState 대신).
  const fromAccount = fromAccountNo || (accountOptions[0]?.accountNo ?? "")
  const selectedAccount = accountOptions.find(
    (a) => a.accountNo === fromAccount,
  )
  const selectedAccountId = withdrawAccounts.find(
    (a) => a.accountNumber === fromAccount,
  )?.accountId
  const amountLabel =
    product.category === "정기적금"
      ? "가입금액(월납입금액)"
      : "가입금액(일시납입액)"

  const termValid =
    termMonths != null &&
    termMonths >= minTermMonths &&
    termMonths <= maxTermMonths
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
          annualRatePercent: getAppliedRateForTerm(detail, termMonths),
        })
      : null

  /**
   * REQ-PRDT-007 은 서버 재검증을 요구한다. 화면이 막는 범위 검증만으로는 약관 동의
   * 이력·출금계좌 소유·잔액을 판단할 수 없어, 다음 단계로 넘기기 전에 서버에 묻는다.
   * 입력할 때마다 부르지 않는 이유는 검증이 조회가 아니라 상태를 남기는 요청이고,
   * 화면 표시는 이미 클라이언트 계산으로 즉시 갱신되기 때문이다(REQ-PRDT-009).
   */
  const handleNext = async () => {
    if (validateMutation.isPending) return
    if (termMonths == null || amount == null || selectedAccountId == null) {
      setValidateError("가입기간·가입금액·출금계좌를 모두 입력하세요.")
      return
    }

    setViolations([])
    setValidateError(null)

    const agreedTerms = prev?.agreedTerms ?? []

    try {
      const result = await validateMutation.mutateAsync({
        data: {
          productId: product.id,
          subscriptionAmount: amount,
          termMonths,
          withdrawalAccountId: selectedAccountId,
          agreedTerms,
        },
      })

      if (result?.valid !== true) {
        setViolations(result?.violations ?? [])
        if ((result?.violations ?? []).length === 0) {
          setValidateError("가입정보를 확인한 뒤 다시 시도하세요.")
        }
        return
      }

      const next: ProductJoinFormState = {
        termMonths,
        fromAccountNo: fromAccount,
        // 가입 실행 요청은 계좌번호가 아니라 계좌 ID를 받는다.
        withdrawalAccountId: selectedAccountId,
        amount,
        // C-03에서 받은 동의 이력을 그대로 실어 나른다.
        agreedTerms,
      }
      navigate(`/product/${product.id}/join/3`, { state: next })
    } catch (e) {
      setValidateError(
        e instanceof ApiError ? e.message : "가입정보 검증에 실패했습니다.",
      )
    }
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
            disabled={!canSubmit || validateMutation.isPending}
            onClick={() => void handleNext()}
          >
            {validateMutation.isPending ? "확인 중..." : "다음"}
          </Button>
        }
      >
        {violations.length > 0 && (
          <Alert variant="danger">
            <ul className="flex flex-col gap-1">
              {violations.map((v) => (
                <li key={`${v.field ?? ""}-${v.code ?? ""}`}>{v.reason}</li>
              ))}
            </ul>
          </Alert>
        )}

        {validateError != null && (
          <Alert variant="danger">{validateError}</Alert>
        )}

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
                min={minTermMonths}
                max={maxTermMonths}
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
                options={accountOptions}
                value={fromAccount}
                onChange={setFromAccountNo}
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
