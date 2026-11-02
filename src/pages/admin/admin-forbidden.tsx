import { useNavigate } from "react-router"
import { ADMIN_PERMISSION_LABELS, type AdminPermission } from "@/entities/auth"
import { useSession } from "@/features/session"
import { Button } from "@/shared/ui/button"
import { EmptyState } from "@/shared/ui/empty-state"

/**
 * 403 권한 경계. 로그인은 되어 있으나 요청한 화면을 볼 수 없는 상태다.
 *
 * 로그인 화면으로 튕기지 않는다 — 재로그인해도 결과가 같아 사용자가 같은 벽에
 * 다시 부딪히고, URL 이 사라져 무엇이 거부됐는지도 남지 않는다.
 *
 * 경계가 둘이라 표시도 둘이다.
 * - **역할 미달**(`RequireAdmin`, 셸 바깥) — 관리자 채널 자체가 막힌다. 전면 화면으로
 *   그리고, 할 수 있는 일은 계정을 바꾸는 것이다.
 * - **권한 부족**(`RequirePermission`, 셸 안쪽) — 채널은 열려 있고 이 화면만 막힌다.
 *   네비가 살아 있는 본문 자리에 그리고, 할 수 있는 일은 권한을 받는 것이다.
 */
export const AdminForbidden = ({
  missingPermission,
}: {
  /** 부족한 권한. 주면 화면 경계, 없으면 채널 경계로 그린다. */
  missingPermission?: AdminPermission
}) => {
  const navigate = useNavigate()
  const { customerName } = useSession()

  if (missingPermission) {
    return (
      <EmptyState
        message="이 화면에 접근할 권한이 없습니다"
        description={`${ADMIN_PERMISSION_LABELS[missingPermission]}(${missingPermission}) 권한이 필요합니다. 권한이 필요하면 관리자에게 문의하세요.`}
        action={
          <Button variant="secondary" onClick={() => navigate("/admin")}>
            관리자 홈으로
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4">
      <div className="w-full max-w-160 rounded-lg border border-border bg-surface-elevated">
        <EmptyState
          message="접근 권한이 없습니다"
          description={`${customerName || "현재 계정"} 계정에는 관리자 채널 권한이 없습니다. 권한이 필요하면 관리자에게 문의하세요.`}
          action={
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => navigate("/dashboard")}
              >
                메인으로
              </Button>
              <Button onClick={() => navigate("/admin/login")}>
                다른 계정으로 로그인
              </Button>
            </div>
          }
        />
      </div>
    </div>
  )
}
