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
  getAppliedRateForTerm,
  getProductTermRange,
  toProductDetailData,
} from "@/entities/product"
import { getToday } from "@/shared/config/clock"
import {
  PRODUCT_JOIN_STEPS,
  type ProductJoinFormState,
  type ProductJoinResult,
} from "@/pages/product/join-shared"
import { EmptyState } from "@/shared/ui/empty-state"
import { useGetProductDetail } from "@/shared/api/generated/product-controller/product-controller"
import {
  useExecuteProductSubscription,
  getProductSubscriptions,
} from "@/shared/api/generated/product-subscription-controller/product-subscription-controller"
import { useWithdrawAccounts } from "@/entities/account"
import type {
  ProductDetailResponse,
  ProductSubscriptionExecuteResponse,
  ProductSubscriptionResultResponse,
} from "@/shared/api/generated/model"
import { ApiError } from "@/shared/api/api-error"

const PASSWORD_LIMIT = 4

// TODO: 계좌비밀번호·OTP 인증 토큰 발급 API가 연동되면 그 결과 토큰으로 교체한다.
// subscription 도메인의 토큰 검증이 아직 mock(빈 값만 아니면 통과)이라 임시 문자열을 쓴다.
const TEMP_AUTH_TOKEN = "temp-auth-token"

/** C-05 상품가입 3단계 · 확인 및 인증 (REQ-PRDT-010, REQ-ACCT-007) */
export const C05ConfirmAuth = () => {
  const { productId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const id = Number(productId)
  const { data, isLoading, isError } = useGetProductDetail(id, {
    query: { enabled: Number.isFinite(id) },
  })

  const [password, setPassword] = React.useState("")
  const [passwordError, setPasswordError] = React.useState<string | null>(null)
  const [otpOpen, setOtpOpen] = React.useState(false)
  const [executeError, setExecuteError] = React.useState<string | null>(null)

  const { accounts: withdrawAccounts } = useWithdrawAccounts()
  const executeMutation = useExecuteProductSubscription()

  // orval이 생성한 타입은 스펙에 적힌 공통 응답 봉투(ApiResponse<T>) 그대로다.
  // customFetch가 런타임에는 이미 봉투를 벗겨 data만 돌려주므로, 실제 형태로 다시 맞춰준다.
  const detail = data as unknown as ProductDetailResponse | undefined

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
  const { minTermMonths } = getProductTermRange(detail)

  const form = (location.state as ProductJoinFormState | null) ?? {
    termMonths: minTermMonths,
    fromAccountNo: "",
    withdrawalAccountId: null,
    amount: product.minAmount,
    agreedTerms: [],
  }

  const account = withdrawAccounts.find(
    (a) => a.accountNumber === form.fromAccountNo,
  )
  const termMonths = form.termMonths ?? minTermMonths
  const amount = form.amount ?? product.minAmount
  const appliedRate = getAppliedRateForTerm(detail, termMonths)

  const maturityDate = addMonthsWithEomCorrection(getToday(), termMonths)
  const expectedMaturity = estimateMaturityAmount({
    category: product.category,
    amount,
    termMonths,
    annualRatePercent: appliedRate,
  })

  /**
   * REQ-ACCT-007의 5회 오류 거래정지는 서버가 판정한다. 계좌비밀번호 인증 API가
   * 아직 없어 화면에서 대조할 방법이 없고, mock 값과 비교하던 기존 코드는 실제
   * 계좌와 무관한 가짜 검증이었다. 여기서는 자릿수만 확인한다.
   */
  const handleAuthenticate = () => {
    if (password.length !== PASSWORD_LIMIT) {
      setPasswordError("계좌비밀번호 4자리를 모두 입력하세요.")
      return
    }
    setPasswordError(null)
    setOtpOpen(true)
  }

  const handleOtpConfirm = async () => {
    setOtpOpen(false)
    if (form.withdrawalAccountId == null) {
      setExecuteError(
        "출금계좌 정보를 확인할 수 없습니다. 이전 단계에서 다시 선택해 주세요.",
      )
      return
    }

    try {
      const response = await executeMutation.mutateAsync({
        data: {
          productId: product.id,
          subscriptionAmount: amount,
          termMonths,
          withdrawalAccountId: form.withdrawalAccountId,
          // 예적금 계좌는 별도 비밀번호를 쓰지 않지만 요청 스펙이 요구한다.
          // 출금계좌 비밀번호를 그대로 싣는다.
          newAccountPassword: password,
          newAccountPasswordConfirm: password,
          accountPasswordAuthToken: TEMP_AUTH_TOKEN,
          otpAuthToken: TEMP_AUTH_TOKEN,
          agreedTerms: form.agreedTerms,
        },
      })

      const executed = response as unknown as
        ProductSubscriptionExecuteResponse | undefined

      // 실행 응답의 계좌번호는 마스킹돼 있고(088******002) 자동이체 프리필도 없다.
      // 원본 계좌번호는 가입 상세 조회에만 담겨 오므로 이어서 한 번 더 부른다.
      // 실패해도 가입 자체는 끝난 상태라 완료 화면 진입을 막지 않는다.
      let prefill: ProductSubscriptionResultResponse["autoTransferPrefill"]
      if (executed?.subscriptionId != null) {
        try {
          const detailResponse = await getProductSubscriptions(
            executed.subscriptionId,
          )
          prefill = (
            detailResponse as unknown as
              ProductSubscriptionResultResponse | undefined
          )?.autoTransferPrefill
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
    }
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
