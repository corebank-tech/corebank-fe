import * as React from "react"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { Alert } from "@/shared/ui/alert"
import { formatAmount } from "@/shared/lib/format"
import { useTransferLimitQuery } from "@/entities/transfer"
import {
  TRANSFER_LIMIT_PER_DAY_MAX as PER_DAY_MAX,
  TRANSFER_LIMIT_PER_TRANSFER_MAX as PER_TRANSFER_MAX,
} from "@/shared/config/policy"
import { useBaseTime } from "@/shared/lib/hooks/use-base-time"
import { D05LimitChangeForm } from "@/pages/transfer/d05-limit-change-form"
import { D05LimitSummary } from "@/pages/transfer/d05-limit-summary"

/**
 * D-05 이체한도 조회/변경. 조회(REQ-TRSF-024)와 변경(REQ-TRSF-025)을 한 화면에서
 * 제공하고, 조회 결과만 두 조각에 나눠 준다.
 *
 * 변경은 계좌비밀번호 확인과 OTP 인증을 모두 거친다(서버 `api_conventions.md` §8-2).
 * 실물 보안매체는 제공하지 않고 Mock OTP 로 대체한다(EX-010).
 */
export const D05TransferLimit = () => {
  const baseTime = useBaseTime()
  const { data: limit, isLoading, isError, error } = useTransferLimitQuery()
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  )

  const isLimitUnavailable = isLoading || isError || limit == null

  return (
    <QueryPageLayout
      noticeItems={[
        "1회 이체한도와 1일 이체한도는 각각 정책 최대치 이내에서 변경할 수 있습니다.",
        "1회 이체한도는 1일 이체한도를 초과할 수 없습니다.",
        "한도 변경 시 계좌비밀번호 확인과 OTP 인증이 모두 필요합니다.",
      ]}
      footerItems={[
        "당일 사용금액과 잔여 이체가능금액은 이체 실행 즉시 갱신됩니다(REQ-TRSF-024).",
        `한도 변경은 1회 최대 ${formatAmount(PER_TRANSFER_MAX)}, 1일 최대 ${formatAmount(PER_DAY_MAX)} 이내에서만 가능하며 계좌비밀번호 확인과 OTP 인증을 거쳐야 적용됩니다(REQ-TRSF-025).`,
        "이체한도는 고객 단위로 적용되며, 계좌비밀번호 확인에 사용한 계좌와 무관하게 전체 계좌에 반영됩니다.",
        "변경에 실패하면 계좌비밀번호 확인과 OTP 인증을 처음부터 다시 받습니다.",
        "보안카드·OTP 실물매체 등 별도의 보안매체는 제공하지 않고 Mock OTP로 대체합니다(EX-010).",
      ]}
    >
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      <D05LimitSummary
        limit={limit}
        isLoading={isLoading}
        isError={isError}
        error={error}
        baseTime={baseTime}
      />

      <D05LimitChangeForm
        oneTimeLimit={limit?.oneTimeLimit ?? 0}
        dailyLimit={limit?.dailyLimit ?? 0}
        isLimitUnavailable={isLimitUnavailable}
        onSuccessMessageChange={setSuccessMessage}
      />
    </QueryPageLayout>
  )
}
