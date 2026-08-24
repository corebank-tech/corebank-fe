import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Alert } from "@/shared/ui/alert"
import { SummaryRow } from "@/shared/ui/summary-row"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { OtpModal, OtpTransactionType } from "@/entities/auth"
import { formatAmount, formatDateTime } from "@/shared/lib/format"
import { onlyDigits as onlyDigitsBase } from "@/shared/lib/input-filter"
import {
  getTransferLimitQueryKey,
  useTransferLimitQuery,
  useUpdateTransferLimitMutation,
} from "@/entities/transfer"
import { ApiError } from "@/shared/api/api-error"
import {
  TRANSFER_LIMIT_PER_DAY_MAX as PER_DAY_MAX,
  TRANSFER_LIMIT_PER_TRANSFER_MAX as PER_TRANSFER_MAX,
} from "@/shared/config/policy"
import { useBaseTime } from "@/shared/lib/hooks/use-base-time"

const onlyDigits = (value: string): string => {
  return onlyDigitsBase(value, 15)
}

const formatDraft = (value: string): string => {
  if (!value) return ""
  return Number(value).toLocaleString("ko-KR")
}

/**
 * D-05 이체한도 조회/변경. 조회(REQ-TRSF-024)와 변경(REQ-TRSF-025)을 한 화면에서
 * 제공한다. 보안매체 등급 개념 없이 OTP 단일 수단으로 변경을 인증한다(EX-010).
 */
export const D05TransferLimit = () => {
  const BASE_TIME = useBaseTime()
  const queryClient = useQueryClient()
  const {
    data: limit,
    isLoading,
    isError,
    error: queryError,
  } = useTransferLimitQuery()
  const updateMutation = useUpdateTransferLimitMutation()

  const oneTimeLimit = limit?.oneTimeLimit ?? 0
  const dailyLimit = limit?.dailyLimit ?? 0
  const isLimitUnavailable = isLoading || isError || limit == null

  const [perTransferDraft, setPerTransferDraft] = React.useState<string | null>(
    null,
  )
  const [perDayDraft, setPerDayDraft] = React.useState<string | null>(null)
  const [fieldError, setFieldError] = React.useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [otpOpen, setOtpOpen] = React.useState(false)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  )
  const [idempotencyKey, setIdempotencyKey] = React.useState("")

  const perTransferInput = perTransferDraft ?? String(oneTimeLimit || "")
  const perDayInput = perDayDraft ?? String(dailyLimit || "")
  const perTransferValue = Number(perTransferInput || 0)
  const perDayValue = Number(perDayInput || 0)

  const resetDraft = () => {
    setPerTransferDraft(null)
    setPerDayDraft(null)
    setFieldError(null)
  }

  const handleSubmitClick = () => {
    setSuccessMessage(null)
    if (!perTransferInput || perTransferValue <= 0) {
      setFieldError("1회 이체한도를 입력하세요.")
      return
    }
    if (!perDayInput || perDayValue <= 0) {
      setFieldError("1일 이체한도를 입력하세요.")
      return
    }
    if (perTransferValue > PER_TRANSFER_MAX) {
      setFieldError(
        `1회 이체한도는 최대 ${formatAmount(PER_TRANSFER_MAX)}까지 변경할 수 있습니다.`,
      )
      return
    }
    if (perDayValue > PER_DAY_MAX) {
      setFieldError(
        `1일 이체한도는 최대 ${formatAmount(PER_DAY_MAX)}까지 변경할 수 있습니다.`,
      )
      return
    }
    if (perTransferValue > perDayValue) {
      setFieldError("1회 이체한도는 1일 이체한도를 초과할 수 없습니다.")
      return
    }
    setFieldError(null)
    setConfirmOpen(true)
  }

  const handleConfirm = () => {
    setConfirmOpen(false)
    setIdempotencyKey(crypto.randomUUID())
    setOtpOpen(true)
  }

  const handleOtpConfirm = async (otpAuthToken: string) => {
    setOtpOpen(false)
    try {
      await updateMutation.mutateAsync({
        oneTimeLimit: perTransferValue,
        dailyLimit: perDayValue,
        otpAuthToken,
        idempotencyKey,
      })
      await queryClient.invalidateQueries({
        queryKey: getTransferLimitQueryKey(),
      })
      resetDraft()
      setSuccessMessage(
        "이체한도가 변경되었습니다. 다음 이체부터 신규 한도가 적용됩니다.",
      )
    } catch (error) {
      setFieldError(
        error instanceof ApiError
          ? error.message
          : "이체한도 변경에 실패했습니다.",
      )
    }
  }

  return (
    <QueryPageLayout
      noticeItems={[
        "1회 이체한도와 1일 이체한도는 각각 정책 최대치 이내에서 변경할 수 있습니다.",
        "1회 이체한도는 1일 이체한도를 초과할 수 없습니다.",
        "한도 변경 시 OTP 인증이 필요하며, 별도의 보안매체는 사용하지 않습니다.",
      ]}
      footerItems={[
        "당일 사용금액과 잔여 이체가능금액은 이체 실행 즉시 갱신됩니다(REQ-TRSF-024).",
        `한도 변경은 1회 최대 ${formatAmount(PER_TRANSFER_MAX)}, 1일 최대 ${formatAmount(PER_DAY_MAX)} 이내에서만 가능하며 OTP 인증을 거쳐야 적용됩니다(REQ-TRSF-025).`,
        "보안카드·OTP 실물매체 등 별도의 보안매체는 제공하지 않으며 OTP 단일 수단으로 인증합니다(EX-010).",
      ]}
      modals={
        <>
          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={handleConfirm}
            title="이체한도 변경"
            messages={[
              "아래 내용으로 이체한도를 변경합니다.",
              "확인 후 OTP 인증을 거쳐 적용됩니다.",
            ]}
            confirmLabel="다음"
            items={[
              {
                label: "신규 1회 이체한도",
                value: formatAmount(perTransferValue),
              },
              { label: "신규 1일 이체한도", value: formatAmount(perDayValue) },
            ]}
          />

          <OtpModal
            open={otpOpen}
            onClose={() => setOtpOpen(false)}
            onConfirm={(otpAuthToken) => void handleOtpConfirm(otpAuthToken)}
            transaction={{
              type: OtpTransactionType.TRANSFER_LIMIT_CHANGE,
              data: { oneTimeLimit: perTransferValue, dailyLimit: perDayValue },
            }}
            title="이체한도 변경 OTP 인증"
            guide="이체한도 변경을 위해 OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하세요."
          />
        </>
      }
    >
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      <FormSection title="이체한도 조회">
        {isLoading && (
          <p className="py-10 text-center text-base text-ink-muted">
            불러오는 중...
          </p>
        )}

        {!isLoading && (isError || limit == null) && (
          <Alert variant="danger">
            {queryError instanceof ApiError
              ? queryError.message
              : "이체한도를 조회하지 못했습니다. 잠시 후 다시 시도하세요."}
          </Alert>
        )}

        {!isLimitUnavailable && (
          <>
            <SummaryRow
              items={[
                {
                  label: "1회 이체한도",
                  value: formatAmount(oneTimeLimit),
                },
                { label: "1일 이체한도", value: formatAmount(dailyLimit) },
                {
                  label: "당일 사용금액",
                  value: formatAmount(limit?.dailyUsedAmount ?? 0),
                },
              ]}
            />
            <div className="mt-4 flex flex-col items-end gap-1 border-t-2 border-t-navy pt-3">
              <span className="font-normal text-ink-muted">
                당일 잔여 이체가능금액
              </span>
              <span className="text-page font-bold text-primary">
                {formatAmount(limit?.dailyRemainingAmount ?? 0)}
              </span>
            </div>
            <p className="mt-2 text-right text-2xs text-ink-muted">
              기준일시 : {formatDateTime(BASE_TIME)}
            </p>
          </>
        )}
      </FormSection>

      <FormSection title="이체한도 변경" className="mb-0">
        <div>
          <FormRow
            label="신규 1회 이체한도"
            required
            htmlFor="d05-per-transfer"
            labelWidth={200}
          >
            <Input
              id="d05-per-transfer"
              inputMode="numeric"
              disabled={isLimitUnavailable}
              value={formatDraft(perTransferInput)}
              onChange={(e) => setPerTransferDraft(onlyDigits(e.target.value))}
              className="max-w-[220px] text-right"
            />
            <span className="shrink-0 text-base text-ink-muted">원</span>
          </FormRow>
          <FormRow
            label="신규 1일 이체한도"
            required
            htmlFor="d05-per-day"
            labelWidth={200}
          >
            <Input
              id="d05-per-day"
              inputMode="numeric"
              disabled={isLimitUnavailable}
              value={formatDraft(perDayInput)}
              onChange={(e) => setPerDayDraft(onlyDigits(e.target.value))}
              className="max-w-[220px] text-right"
            />
            <span className="shrink-0 text-base text-ink-muted">원</span>
          </FormRow>
        </div>
        <p className="mt-2 text-2xs text-ink-muted">
          ※ 1회 한도는 최대 {formatAmount(PER_TRANSFER_MAX)}, 1일 한도는 최대{" "}
          {formatAmount(PER_DAY_MAX)}까지 변경할 수 있으며, 1회 한도는 1일
          한도를 초과할 수 없습니다.
        </p>

        {fieldError && (
          <p role="alert" className="mt-2 text-base font-bold text-danger">
            {fieldError}
          </p>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Button
            variant="secondary"
            size="lg"
            className="min-w-30"
            disabled={isLimitUnavailable}
            onClick={resetDraft}
          >
            초기화
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="min-w-30"
            disabled={isLimitUnavailable || updateMutation.isPending}
            onClick={handleSubmitClick}
          >
            {updateMutation.isPending ? "변경 중..." : "변경하기"}
          </Button>
        </div>
      </FormSection>
    </QueryPageLayout>
  )
}
