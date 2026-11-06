import * as React from "react"
import { useLocation, useNavigate, useParams } from "react-router"
import { Button } from "@/shared/ui/button"
import { FormSection } from "@/shared/ui/form-section"
import { StepLayout } from "@/shared/ui/step-layout"
import { ConfirmSummary } from "@/shared/ui/confirm-summary"
import { AccountPasswordField } from "@/widgets/transfer"
import { OtpModal, OtpTransactionType } from "@/entities/auth"
import { ErrorDialog } from "@/shared/ui/error-dialog"
import {
  formatAccountNo,
  formatAmount,
  formatDate,
  formatKoreanAmount,
} from "@/shared/lib/format"
import {
  useProductDetail,
  useExecuteSubscription,
  fetchSubscriptionResult,
  type ProductSubscriptionResultResponse,
  addMonthsWithEomCorrection,
  estimateMaturityAmount,
  getAppliedRateForTerm,
  toProductDetailData,
} from "@/entities/product"
import { getToday } from "@/shared/config/clock"
import {
  PRODUCT_JOIN_STEPS,
  type ProductJoinFormState,
  type ProductJoinResult,
} from "@/pages/product/join-shared"
import { EmptyState } from "@/shared/ui/empty-state"
import { ProductJoinRestartNotice } from "@/pages/product/join-restart-notice"
import {
  useVerifyAccountPasswordMutation,
  useWithdrawAccounts,
} from "@/entities/account"
import { ApiError } from "@/shared/api/api-error"
import { FormRow } from "@/shared/ui/form-row"
import { Input } from "@/shared/ui/input"
import { onlyDigits } from "@/shared/lib/input-filter"

const PASSWORD_LIMIT = 4

/** C-05 상품가입 3단계 · 확인 및 인증 (REQ-PRDT-010, REQ-ACCT-007) */
export const C05ConfirmAuth = () => {
  const { productId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const id = Number(productId)
  const { detail, isLoading, isError } = useProductDetail(id)

  const [password, setPassword] = React.useState("")
  const [passwordError, setPasswordError] = React.useState<string | null>(null)
  const [newAccountPassword, setNewAccountPassword] = React.useState("")
  const [newAccountPasswordConfirm, setNewAccountPasswordConfirm] =
    React.useState("")
  const [newAccountPasswordError, setNewAccountPasswordError] = React.useState<
    string | null
  >(null)
  const [accountPasswordAuthToken, setAccountPasswordAuthToken] =
    React.useState<string | null>(null)
  const [otpOpen, setOtpOpen] = React.useState(false)
  const [executeError, setExecuteError] = React.useState<string | null>(null)
  // 실행 요청 + 뒤이은 상세 조회까지를 하나의 진행 구간으로 잡는다.
  // mutation.isPending은 실행 응답이 오는 순간 풀려서 상세 조회 구간이 열린다.
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const { accounts: withdrawAccounts } = useWithdrawAccounts()
  const verifyPasswordMutation = useVerifyAccountPasswordMutation()
  const executeMutation = useExecuteSubscription()

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
  // 라우터 state는 새로고침으로 사라진다. 상품 최솟값으로 채우면 고객이 입력한 적
  // 없는 가입기간·금액이 "가입내용 확인"으로 표시되고, 그 값으로 적용금리·만기예정일·
  // 예상 만기금액까지 다시 계산된다(REQ-PRDT-010은 "입력 내용을 요약 표시"를 요구한다).
  // C-06이 같은 상황에서 쓰는 안내로 끊는다.
  //
  // 필수값까지 함께 본다. state가 있어도 가입기간·가입금액이 비어 있으면 요약할
  // 내용이 없는 것은 마찬가지다.
  const form = location.state as ProductJoinFormState | null
  if (form == null || form.termMonths == null || form.amount == null) {
    return <ProductJoinRestartNotice currentStep={3} />
  }

  const account = withdrawAccounts.find(
    (a) => a.accountNumber === form.fromAccountNo,
  )
  const termMonths = form.termMonths
  const amount = form.amount
  const appliedRate = getAppliedRateForTerm(detail, termMonths)

  const maturityDate = addMonthsWithEomCorrection(getToday(), termMonths)
  const expectedMaturity = estimateMaturityAmount({
    category: product.category,
    amount,
    termMonths,
    annualRatePercent: appliedRate,
  })

  /**
   * 계좌비밀번호를 서버에 검증해 `accountPasswordAuthToken`을 받는다.
   * REQ-ACCT-007의 5회 오류 거래정지는 서버가 판정하므로, 화면은 실패 사유를
   * 서버 메시지 그대로 노출하고 누적 횟수를 따로 세지 않는다.
   */
  const handleAuthenticate = async () => {
    if (password.length !== PASSWORD_LIMIT) {
      setPasswordError("출금계좌 비밀번호 4자리를 모두 입력하세요.")
      return
    }

    if (!/^\d{4}$/.test(newAccountPassword)) {
      setNewAccountPasswordError(
        "신규 계좌 비밀번호는 숫자 4자리로 입력하세요.",
      )
      return
    }

    if (newAccountPassword !== newAccountPasswordConfirm) {
      setNewAccountPasswordError(
        "신규 계좌 비밀번호와 확인값이 일치하지 않습니다.",
      )
      return
    }

    setNewAccountPasswordError(null)

    if (otpTransactionData == null) {
      setExecuteError(
        "출금계좌 정보를 확인할 수 없습니다. 이전 단계에서 다시 선택해 주세요.",
      )
      return
    }

    setPasswordError(null)

    try {
      const response = await verifyPasswordMutation.mutateAsync({
        accountId: otpTransactionData.withdrawalAccountId,
        data: {
          accountPassword: password,
        },
      })

      // 평문 비밀번호 및 mutation variables 즉시 제거
      setPassword("")
      verifyPasswordMutation.reset()

      if (!response.accountPasswordAuthToken) {
        setPasswordError(
          "계좌비밀번호 인증 토큰을 발급받지 못했습니다. 다시 시도해 주세요.",
        )
        return
      }

      setAccountPasswordAuthToken(response.accountPasswordAuthToken)
      setOtpOpen(true)
    } catch (e) {
      // 실패 시에도 평문 비밀번호 및 mutation variables 제거
      setPassword("")
      verifyPasswordMutation.reset()

      setPasswordError(
        e instanceof ApiError ? e.message : "계좌비밀번호 인증에 실패했습니다.",
      )
    }
  }

  /**
   * OTP 발급 시점의 거래정보와 가입 실행 요청을 서버가 정규화해 대조한다(어긋나면
   * OTP0102). 서버가 재구성하는 항목은 아래 네 개뿐이다
   * (ProductSubscriptionOtpVerificationAdapter.verifyAndConsume). 실행 요청도 이
   * 객체를 그대로 펼쳐 쓴다 — 두 곳에 같은 값을 손으로 적으면 한쪽만 고쳐도
   * 조용히 어긋난다.
   */
  const otpTransactionData =
    form.withdrawalAccountId == null
      ? null
      : {
          productId: product.id,
          subscriptionAmount: amount,
          termMonths,
          withdrawalAccountId: form.withdrawalAccountId,
        }

  // 실행 요청이 나가는 동안 다시 눌리지 않게 막는다. OtpModal은 onConfirm만
  // 호출하고 스스로 닫지 않아서(otp-modal.tsx), 확인 버튼을 빠르게 두 번 누르면
  // 가입 실행이 두 번 나간다. 멱등키는 customFetch가 요청마다 새로 만들기 때문에
  // 서버 멱등성으로도 걸러지지 않는다.
  const handleOtpConfirm = async (otpAuthToken: string) => {
    // 인증 단계에서 확보한 거래정보와 계좌비밀번호 인증 토큰이 모두 있어야
    // 상품가입 실행 요청을 보낸다.
    if (
      isSubmitting ||
      otpTransactionData == null ||
      accountPasswordAuthToken == null
    ) {
      return
    }

    if (
      !/^\d{4}$/.test(newAccountPassword) ||
      newAccountPassword !== newAccountPasswordConfirm
    ) {
      setOtpOpen(false)
      setNewAccountPasswordError("신규 계좌 비밀번호를 다시 확인해 주세요.")
      return
    }

    setOtpOpen(false)

    setIsSubmitting(true)
    try {
      const response = await executeMutation.mutateAsync({
        data: {
          ...otpTransactionData,
          newAccountPassword,
          newAccountPasswordConfirm,
          accountPasswordAuthToken,
          otpAuthToken,
          agreedTerms: form.agreedTerms,
        },
      })

      const executed = response

      // 실행 응답의 계좌번호는 마스킹돼 있고(088******002) 자동이체 프리필도 없다.
      // 원본 계좌번호는 가입 상세 조회에만 담겨 오므로 이어서 한 번 더 부른다.
      // 실패해도 가입 자체는 끝난 상태라 완료 화면 진입을 막지 않는다.
      let prefill: ProductSubscriptionResultResponse["autoTransferPrefill"]
      if (executed?.subscriptionId != null) {
        try {
          const subscription = await fetchSubscriptionResult(
            executed.subscriptionId,
          )
          prefill = subscription?.autoTransferPrefill
        } catch {
          prefill = undefined
        }
      }

      // 계좌번호·만기일·예상만기금액·적용금리는 서버 산출값을 그대로 쓴다.
      // 화면에서 다시 계산하면 이자 계산 규칙이 갈린다.
      const result: ProductJoinResult = {
        productId: product.id,
        productName: executed?.productName ?? product.name,
        category: product.category,
        newAccountNo: executed?.accountNumber ?? "",
        amount: executed?.subscriptionAmount ?? amount,
        termMonths: executed?.termMonths ?? termMonths,
        maturityDate: executed?.maturityDate ?? maturityDate,
        rate: executed?.appliedRate ?? appliedRate,
        autoTransferPrefill: prefill && {
          depositAccountNumber: prefill.depositAccountNumber ?? "",
          amount: prefill.amount ?? amount,
          cycleMonths: prefill.cycleMonths ?? 1,
          endDate: prefill.endDate ?? executed?.maturityDate ?? maturityDate,
        },
      }
      navigate(`/product/${product.id}/join/4`, { state: result })
    } catch (e) {
      setExecuteError(
        e instanceof ApiError ? e.message : "상품가입에 실패했습니다.",
      )
    } finally {
      executeMutation.reset()
      setNewAccountPassword("")
      setNewAccountPasswordConfirm("")
      setAccountPasswordAuthToken(null)
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <StepLayout
        steps={PRODUCT_JOIN_STEPS}
        currentStep={3}
        title={`${product.name} 가입`}
        notice={[
          "출금계좌 비밀번호를 인증하고 신규 상품 계좌 비밀번호를 설정한 뒤 OTP 인증을 완료하면 가입이 실행됩니다.",
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
              disabled={isSubmitting || verifyPasswordMutation.isPending}
              onClick={handleAuthenticate}
            >
              {verifyPasswordMutation.isPending
                ? "계좌 인증 중..."
                : isSubmitting
                  ? "가입 처리 중..."
                  : "인증하고 가입하기"}
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
                value: `${account?.accountName ?? ""} ${formatAccountNo(form.fromAccountNo)}`,
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

        <FormSection title="출금계좌 비밀번호 인증">
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
          </div>
        </FormSection>
        <FormSection title="신규 예·적금 계좌 비밀번호 설정">
          <div>
            <FormRow
              label="신규 계좌 비밀번호"
              required
              htmlFor="c05-new-password"
              labelWidth={220}
            >
              <Input
                id="c05-new-password"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={PASSWORD_LIMIT}
                value={newAccountPassword}
                disabled={isSubmitting || verifyPasswordMutation.isPending}
                onChange={(e) => {
                  setNewAccountPassword(
                    onlyDigits(e.target.value, PASSWORD_LIMIT),
                  )
                  setNewAccountPasswordError(null)
                }}
                className="w-32 text-center tracking-4"
              />
            </FormRow>

            <FormRow
              label="신규 계좌 비밀번호 확인"
              required
              htmlFor="c05-new-password-confirm"
              labelWidth={220}
            >
              <Input
                id="c05-new-password-confirm"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={PASSWORD_LIMIT}
                value={newAccountPasswordConfirm}
                disabled={isSubmitting || verifyPasswordMutation.isPending}
                onChange={(e) => {
                  setNewAccountPasswordConfirm(
                    onlyDigits(e.target.value, PASSWORD_LIMIT),
                  )
                  setNewAccountPasswordError(null)
                }}
                className="w-32 text-center tracking-4"
              />
            </FormRow>
          </div>

          {newAccountPasswordError && (
            <p role="alert" className="mt-2 text-xs font-bold text-danger">
              {newAccountPasswordError}
            </p>
          )}

          <p className="mt-2 text-2xs text-ink-muted">
            ※ 신규 계좌 비밀번호는 숫자 4자리이며, 만기해지·중도해지 및
            계좌비밀번호 변경 시 사용됩니다. 설정한 비밀번호를 기억해 주세요.
          </p>
        </FormSection>
      </StepLayout>

      {otpTransactionData != null && (
        <OtpModal
          open={otpOpen}
          onClose={() => {
            setOtpOpen(false)
            setAccountPasswordAuthToken(null)
          }}
          onConfirm={handleOtpConfirm}
          title="상품가입 OTP 인증"
          guide="OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하면 가입이 실행됩니다."
          transaction={{
            type: OtpTransactionType.PRODUCT_SUBSCRIPTION,
            data: otpTransactionData,
          }}
        />
      )}

      {/* REQ-ACCT-007의 5회 오류 거래정지는 서버가 판정한다. 계좌비밀번호 인증
          API가 붙으면 그 응답의 오류 횟수·정지 여부를 여기서 다시 안내한다. */}
      <ErrorDialog
        open={executeError != null}
        onClose={() => setExecuteError(null)}
        title="상품가입 실패"
        messages={executeError ? [executeError] : []}
      />
    </>
  )
}
