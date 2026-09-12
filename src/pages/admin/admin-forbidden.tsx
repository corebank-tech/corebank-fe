import { useNavigate } from "react-router"
import { useSession } from "@/features/session"
import { Button } from "@/shared/ui/button"
import { EmptyState } from "@/shared/ui/empty-state"

/**
 * 403 권한 경계. 로그인은 되어 있으나 관리자 채널 권한이 없는 상태다.
 *
 * 로그인 화면으로 튕기지 않는다 — 재로그인해도 결과가 같아 사용자가 같은 벽에
 * 다시 부딪히고, URL 이 사라져 무엇이 거부됐는지도 남지 않는다.
 */
export const AdminForbidden = () => {
  const navigate = useNavigate()
  const { customerName } = useSession()

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
