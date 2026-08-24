import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import { formatDateTime } from "@/shared/lib/format"
import { useBaseTime } from "@/shared/lib/hooks/use-base-time"
import type { CustomerInfo } from "@/entities/customer"

type Props = {
  profile: CustomerInfo
}

export const F01ProfileSummary = ({ profile }: Props) => {
  const BASE_TIME = useBaseTime()
  return (
    <FormSection title="고객정보 조회">
      <div>
        <FormRow label="성명" labelWidth={180}>
          <span className="text-ink">{profile.userName}</span>
        </FormRow>
        <FormRow label="아이디" labelWidth={180}>
          <span className="text-ink">{profile.userId}</span>
        </FormRow>
        <FormRow label="생년월일" labelWidth={180}>
          <span className="text-ink">{profile.birthDate}</span>
        </FormRow>
        <FormRow label="휴대폰번호" labelWidth={180}>
          <span className="text-ink">{profile.phoneNumber}</span>
        </FormRow>
        <FormRow label="이메일" labelWidth={180}>
          <span className="text-ink">{profile.email}</span>
        </FormRow>
      </div>
      <p className="mt-2 text-right text-2xs text-ink-muted">
        기준일시 : {formatDateTime(BASE_TIME)}
      </p>
    </FormSection>
  )
}
