import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import {
  formatDateTime,
  maskBirthDate,
  maskEmail,
  maskName,
  maskPhone,
  maskUserId,
} from "@/shared/lib/format"
import { MOCK_NOW as BASE_TIME } from "@/shared/config/mock-clock"
import type { CustomerProfile } from "@/entities/customer"

type Props = {
  profile: CustomerProfile
}

export const F01ProfileSummary = ({ profile }: Props) => {
  return (
    <FormSection title="고객정보 조회">
      <div>
        <FormRow label="성명" labelWidth={180}>
          <span className="text-ink">{maskName(profile.name)}</span>
        </FormRow>
        <FormRow label="아이디" labelWidth={180}>
          <span className="text-ink">{maskUserId(profile.userId)}</span>
        </FormRow>
        <FormRow label="생년월일" labelWidth={180}>
          <span className="text-ink">{maskBirthDate(profile.dob)}</span>
        </FormRow>
        <FormRow label="휴대폰번호" labelWidth={180}>
          <span className="text-ink">{maskPhone(profile.phone)}</span>
        </FormRow>
        <FormRow label="이메일" labelWidth={180}>
          <span className="text-ink">{maskEmail(profile.email)}</span>
        </FormRow>
      </div>
      <p className="mt-2 text-right text-2xs text-ink-muted">
        기준일시 : {formatDateTime(BASE_TIME)}
      </p>
    </FormSection>
  )
}
