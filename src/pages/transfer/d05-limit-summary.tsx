import { FormSection } from "@/shared/ui/form-section"
import { Alert } from "@/shared/ui/alert"
import { SummaryRow } from "@/shared/ui/summary-row"
import { formatAmount, formatDateTime } from "@/shared/lib/format"
import { ApiError } from "@/shared/api/api-error"
import type { TransferLimit } from "@/entities/transfer"

type Props = {
  limit: TransferLimit | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
  baseTime: string
}

/**
 * D-05 이체한도 조회(REQ-TRSF-024). 1회·1일 한도와 당일 사용금액, 당일 잔여
 * 이체가능금액을 기준일시와 함께 보여준다.
 */
export const D05LimitSummary = ({
  limit,
  isLoading,
  isError,
  error,
  baseTime,
}: Props) => {
  return (
    <FormSection title="이체한도 조회">
      {isLoading && (
        <p className="py-10 text-center text-base text-ink-muted">
          불러오는 중...
        </p>
      )}

      {!isLoading && (isError || limit == null) && (
        <Alert variant="danger">
          {error instanceof ApiError
            ? error.message
            : "이체한도를 조회하지 못했습니다. 잠시 후 다시 시도하세요."}
        </Alert>
      )}

      {!isLoading && !isError && limit != null && (
        <>
          <SummaryRow
            items={[
              {
                label: "1회 이체한도",
                value: formatAmount(limit.oneTimeLimit ?? 0),
              },
              {
                label: "1일 이체한도",
                value: formatAmount(limit.dailyLimit ?? 0),
              },
              {
                label: "당일 사용금액",
                value: formatAmount(limit.dailyUsedAmount ?? 0),
              },
            ]}
          />
          <div className="mt-4 flex flex-col items-end gap-1 border-t-2 border-t-navy pt-3">
            <span className="font-normal text-ink-muted">
              당일 잔여 이체가능금액
            </span>
            <span className="text-page font-bold text-primary">
              {formatAmount(limit.dailyRemainingAmount ?? 0)}
            </span>
          </div>
          <p className="mt-2 text-right text-2xs text-ink-muted">
            기준일시 : {formatDateTime(baseTime)}
          </p>
        </>
      )}
    </FormSection>
  )
}
