import { Link } from "react-router"
import {
  MY_CASE_STATUS_LABEL,
  SUPPLEMENT_REQUESTED,
  labelOf,
  type MyPaymentStop,
} from "@/entities/payment-stop"
import {
  MY_PAYMENT_STOPS_PATH,
  statusTextOf,
} from "@/pages/objection/objection-shared"
import { toErrorMessage } from "@/shared/api/api-error"
import { formatAmount, formatDate } from "@/shared/lib/format"
import { Alert } from "@/shared/ui/alert"
import { Badge, type BadgeVariant } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { EmptyState } from "@/shared/ui/empty-state"
import { FormRow } from "@/shared/ui/form-row"
import { Spinner } from "@/shared/ui/spinner"

/** 이의제기 고객 화면 세 개가 함께 쓰는 사건 표시 조각. */

/**
 * 확정된 결과는 결과마다 색을 나눈다. 불수용을 성공색으로 보이면 고객이 해제된 줄 안다.
 * 결과를 모르는 확정은 중립으로 둔다.
 */
const DECISION_VARIANT: Record<string, BadgeVariant> = {
  ACCEPTED: "success",
  PARTIAL: "warning",
  REJECTED: "danger",
}

const statusVariantOf = (item: MyPaymentStop): BadgeVariant => {
  if (item.objectionStatus == null) return "neutral"
  if (item.objectionStatus === SUPPLEMENT_REQUESTED) return "warning"
  if (item.objectionStatus === "DECIDED") {
    return DECISION_VARIANT[item.decisionResult ?? ""] ?? "neutral"
  }
  return "primary"
}

/** 확정된 결과가 계좌에 무엇을 뜻하는지. */
const DECISION_GUIDE: Record<string, string> = {
  ACCEPTED: "이의제기가 받아들여졌습니다.",
  PARTIAL:
    "이의제기가 일부만 받아들여졌습니다. 다툼 금액 중 일부는 지급정지가 이어집니다.",
  REJECTED: "이의제기가 받아들여지지 않았습니다. 지급정지가 이어집니다.",
}

export const StatusBadge = ({ item }: { item: MyPaymentStop }) => (
  <Badge variant={statusVariantOf(item)}>{statusTextOf(item)}</Badge>
)

/** 사건 기본 정보 행. FormRow 를 쌓아 표 한 덩어리로 보인다. */
export const CaseInfoRows = ({ item }: { item: MyPaymentStop }) => (
  <div>
    <FormRow label="지급정지 계좌">
      <span className="text-base text-ink">{item.accountNumberMasked}</span>
    </FormRow>
    <FormRow label="다툼 금액">
      <span className="text-base font-bold text-ink">
        {formatAmount(item.disputedTotal)}
      </span>
      <span className="text-2xs text-ink-muted">
        피해구제 신청이 들어온 입금의 합계입니다.
      </span>
    </FormRow>
    <FormRow label="이의제기 신청 기한">
      <span className="text-base text-ink">
        {item.objectionDeadline ? formatDate(item.objectionDeadline) : "-"}
      </span>
      <span className="text-2xs text-ink-muted">
        이 날까지 신청할 수 있습니다.
      </span>
    </FormRow>
  </div>
)

/** 확정된 심사결과와 지금 지급정지 상태. 확정 전이면 그리지 않는다. */
export const DecisionResultRows = ({ item }: { item: MyPaymentStop }) => {
  if (item.decisionResult == null) return null
  return (
    <div>
      <FormRow label="심사 결과" className="border-t-0">
        <span className="text-base font-bold text-ink">
          {statusTextOf(item)}
        </span>
        {DECISION_GUIDE[item.decisionResult] && (
          <span className="text-2xs text-ink-muted">
            {DECISION_GUIDE[item.decisionResult]}
          </span>
        )}
      </FormRow>
      {item.caseStatus !== "" && (
        <FormRow label="지급정지 상태" className="border-t-0">
          <span className="text-base text-ink">
            {labelOf(MY_CASE_STATUS_LABEL, item.caseStatus)}
          </span>
        </FormRow>
      )}
    </div>
  )
}

/** 보완 요청 내용. 보완 요청 상태일 때만 그린다. */
export const SupplementRequestNotice = ({ item }: { item: MyPaymentStop }) => {
  if (item.objectionStatus !== SUPPLEMENT_REQUESTED) return null
  return (
    <Alert variant="warning" title="서류 보완 요청">
      <p>
        {item.supplementDue
          ? `${formatDate(item.supplementDue)}까지 아래 서류를 보완 제출하세요.`
          : "아래 서류를 보완 제출하세요."}{" "}
        기한 안에 내지 않으면 이의제기가 받아들여지지 않을 수 있습니다.
      </p>
      {item.missingDocuments.length > 0 && (
        <ul className="mt-1 list-disc pl-5" aria-label="보완 요청 서류">
          {item.missingDocuments.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
    </Alert>
  )
}

export const LoadingCases = () => (
  <div
    className="flex items-center justify-center gap-2 py-14 text-base text-ink-muted"
    role="status"
  >
    <Spinner size="sm" />
    지급정지 사건을 불러오는 중입니다.
  </div>
)

export const CasesLoadError = ({
  error,
  onRetry,
}: {
  error: unknown
  onRetry: () => void
}) => {
  const message = toErrorMessage(error)
  if (message == null) return null
  return (
    <Alert variant="danger" title="지급정지 사건을 불러오지 못했습니다">
      <p>{message}</p>
      <Button variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
        다시 조회
      </Button>
    </Alert>
  )
}

/** 경로의 사건을 찾지 못했을 때. 남의 사건인지 없는 사건인지 구분하지 않는다. */
export const CaseNotFound = () => (
  <EmptyState
    message="이의제기를 신청할 수 있는 지급정지 사건이 아닙니다."
    description="지급정지 이의제기 화면에서 사건을 다시 고르세요."
    action={
      <Link
        to={MY_PAYMENT_STOPS_PATH}
        className="text-base font-bold text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        지급정지 이의제기 목록
      </Link>
    }
  />
)
