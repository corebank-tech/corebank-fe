import {
  isRouteErrorResponse,
  useLocation,
  useNavigate,
  useRouteError,
} from "react-router"
import { isAdminPath } from "@/app/routes/admin-routes"
import { Button } from "@/shared/ui/button"
import { EmptyState } from "@/shared/ui/empty-state"

/**
 * 루트 라우트의 오류 경계. 없는 주소(404)와 라우트 하위에서 던져진 렌더 오류를
 * 함께 받는다. 이게 없으면 데이터 라우터의 기본 오류 화면
 * ("Unexpected Application Error!")이 프로덕션에서도 사용자에게 그대로 보인다.
 *
 * 루트 라우트의 `element`(RootLayout) 자리에 대신 그려지므로 세션·알림 프로바이더
 * 바깥이다 — `useSession` 을 쓰지 않는다.
 */
export const RouteError = () => {
  const error = useRouteError()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isNotFound = isRouteErrorResponse(error) && error.status === 404
  // 시작 지점은 보고 있던 채널을 따른다(session-expired-gate.tsx 와 같은 규칙).
  const homePath = isAdminPath(pathname) ? "/admin" : "/"

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4">
      <div className="w-full max-w-160 rounded-lg border border-border bg-surface-elevated">
        <EmptyState
          message={
            isNotFound
              ? "페이지를 찾을 수 없습니다"
              : "화면을 표시하지 못했습니다"
          }
          description={
            isNotFound
              ? "주소가 잘못되었거나 더 이상 제공하지 않는 화면입니다."
              : "일시적인 오류일 수 있습니다. 잠시 후 다시 시도해 주세요."
          }
          action={
            <Button onClick={() => navigate(homePath, { replace: true })}>
              처음으로
            </Button>
          }
        />
      </div>
    </div>
  )
}
