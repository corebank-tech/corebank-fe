import { Select } from "@/shared/ui/select"
import {
  ACCESS_REASONS,
  isAccessReason,
  type AccessReason,
} from "@/entities/admin-customer/lib/access-reason"

type AccessReasonSelectProps = {
  id: string
  value: AccessReason | null
  onChange: (reason: AccessReason | null) => void
  invalid?: boolean
}

/**
 * 조회 사유 선택(REQ-ADM-019). 처음에는 아무것도 고르지 않은 상태다 — 기본값을
 * 미리 골라 두면 관리자가 사유를 의식하지 않고 넘어가 조회 사유 강제가 무의미해진다.
 */
export const AccessReasonSelect = ({
  id,
  value,
  onChange,
  invalid,
}: AccessReasonSelectProps) => (
  <Select
    id={id}
    className="max-w-48"
    value={value ?? ""}
    invalid={invalid}
    onChange={(event) =>
      onChange(isAccessReason(event.target.value) ? event.target.value : null)
    }
  >
    <option value="">선택하세요</option>
    {ACCESS_REASONS.map((reason) => (
      <option key={reason.code} value={reason.code}>
        {reason.label}
      </option>
    ))}
  </Select>
)
