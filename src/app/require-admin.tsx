import type * as React from "react"
import { Navigate, useLocation } from "react-router"
import { useSession } from "@/features/session"
import { AdminForbidden } from "@/pages/admin"

/**
 * 관리자 채널 경계. `RequireAuth` 가 "로그인했는가"만 보는 것과 달리 관리자
 * 역할인지를 본다.
 *
 * 역할을 prop 으로 받지 않는다 — 실패 도착지(`/admin/login`, `AdminForbidden`)가
 * 관리자 채널 전용이라, 다른 역할에 쓰면 둘 다 틀린다. 다른 역할 가드가 필요해지면
 * 도착지부터 함께 갈라야 한다.
 *
 * 인증 실패와 인가 실패를 다르게 다룬다 — 로그인하지 않았으면 관리자 로그인으로
 * 보내고, 로그인은 했는데 관리자가 아니면 **403 화면을 그 자리에 그린다.**
 * 리다이렉트하면 URL 이 사라져 무엇이 거부됐는지 남지 않는다.
 *
 * 화면 가드는 서버 인가를 대신하지 않는다. 서버가 여전히 거부하고, 이건 그 위에
 * 한 겹 더 얹어 권한 없는 사용자가 버튼을 누르기 전에 막는 것이다.
 */
export const RequireAdmin = ({
  children,
}: {
  children: React.ReactElement
}) => {
  const { isAuthenticated, isBootstrapping, role } = useSession()
  const location = useLocation()

  // 세션 복원 응답 전에는 역할이 미정이다. 여기서 403 을 그리면 새로고침마다
  // 권한 없음 화면이 한 번 번쩍이고 되돌아온다.
  if (isBootstrapping) return null

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}`
    return <Navigate to="/admin/login" replace state={{ from }} />
  }

  if (role !== "ADMIN") return <AdminForbidden />

  return children
}
