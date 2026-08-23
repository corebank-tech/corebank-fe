import * as React from "react"
import { MOCK_PROFILE, useCustomerProfileQuery } from "@/entities/customer"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { F01ProfileContactForm } from "@/pages/mypage/f01-profile-contact-form"
import { F01ProfilePasswordForm } from "@/pages/mypage/f01-profile-password-form"
import { F01ProfileSummary } from "@/pages/mypage/f01-profile-summary"

/**
 * F-01 고객정보 조회/변경. REQ-MYPG-001·002·003의 독립 컴포넌트를
 * 조립하고 저장된 고객정보 상태만 공유한다.
 */
export const F01Profile = () => {
  const {
    data: customerInfo,
    isPending: isProfilePending,
    isError: isProfileError,
  } = useCustomerProfileQuery()

  // 연락처/비밀번호 API 연동 전까지만 유지하는 임시 mock 상태
  const [mockProfile, setMockProfile] = React.useState(MOCK_PROFILE)

  return (
    <QueryPageLayout
      noticeItems={[
        "이 화면에서는 휴대폰번호와 이메일 주소만 변경할 수 있습니다. 주소 등 그 외 정보는 변경할 수 없습니다.",
        "이메일을 변경하면 신규 이메일로 인증번호를 재발송해 확인해야 저장됩니다.",
        "로그인 비밀번호는 현재 비밀번호 확인 후에만 변경할 수 있습니다.",
      ]}
      footerItems={[
        "고객정보 조회 항목 중 성명·아이디·생년월일·휴대폰번호·이메일은 마스킹되어 표시됩니다(REQ-MYPG-001).",
        "이메일 변경은 신규 이메일 인증번호 확인 완료 후에만 저장되며, 이미 가입된 이메일로는 변경할 수 없습니다(REQ-MYPG-002).",
        "로그인 비밀번호는 8~15자, 4종 중 3종 이상 조합이며 직전 비밀번호와 동일한 값은 사용할 수 없습니다(REQ-AUTH-011·012·034).",
      ]}
    >
      {isProfilePending && (
        <p className="py-8 text-center text-base text-ink-muted">
          고객정보를 불러오는 중입니다.
        </p>
      )}

      {isProfileError && (
        <p className="py-8 text-center text-base text-danger">
          고객정보를 불러오지 못했습니다.
        </p>
      )}

      {customerInfo && <F01ProfileSummary profile={customerInfo} />}

      {customerInfo && <F01ProfileContactForm profile={customerInfo} />}
      <F01ProfilePasswordForm
        profile={mockProfile}
        onProfileChange={setMockProfile}
      />
    </QueryPageLayout>
  )
}
