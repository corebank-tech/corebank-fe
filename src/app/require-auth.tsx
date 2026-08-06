import type * as React from "react"
import { Navigate, useLocation } from "react-router"
import { useSession } from "@/features/session"

/**
 * REQ-CMN-006: 비로그인 상태에서 인증 필요 화면 접근 시 로그인으로 리다이렉트하고,
 * 로그인 성공 후 최초 요청 화면으로 복귀한다. 복귀 경로는 location.state.from 으로 전달한다.
 */
export const RequireAuth = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated } = useSession()
  const location = useLocation()

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}`
    return <Navigate to="/" replace state={{ from }} />
  }

  return children
}
