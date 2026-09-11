import { useLocation, useNavigate } from "react-router"
import { isAdminPath } from "@/app/routes/admin-routes"
import { SessionExpiredModal } from "@/entities/auth"
import { useSession } from "@/features/session"

/**
 * A-11 세션 만료. SessionProvider의 10분 무조작 타이머가 만료되면 전 화면
 * 위에 비해제형 모달을 띄운다(REQ-AUTH-031).
 */
export const SessionExpiredGate = () => {
  const { expiredReason, acknowledgeExpired } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  if (expiredReason == null) return null

  /**
   * 도착지는 만료 시점에 보고 있던 채널을 따른다. 관리자 화면에서 끊겼는데 고객
   * 로그인으로 보내면 재로그인해도 `/dashboard` 로 가서, 원래 보던 화면으로
   * 돌아가려면 주소를 직접 쳐야 한다. RequireRole 이 인증 실패를
   * `/admin/login` 으로 보내는 것과 같은 규칙이다(app/require-role.tsx).
   */
  const loginPath = isAdminPath(location.pathname) ? "/admin/login" : "/"

  const goRelogin = () => {
    acknowledgeExpired()
    navigate(loginPath, { replace: true })
  }
  // 만료 후에는 대시보드가 RequireAuth 에 막히므로 어차피 로그인 화면으로 튕긴다.
  // 튕겨서 도착하게 두면 버튼이 먹지 않는 것처럼 보여, 도착지를 명시한다
  // (REQ-AUTH-031 이 버튼 2개를 요구하므로 버튼 자체는 유지한다).
  // [다시 로그인]과 결과가 같아지는 것은 라벨 불일치가 아니라, "메인화면"을
  // 인증 여부와 무관한 **그 채널의** 시작 지점으로 해석한 결과다 — 만료 상태에서
  // 그 시작 지점이 로그인 화면인 것은 RequireAuth·RequireRole 의 정상 동작이다.
  // #95 에서 확정(2026-08-24). 채널별 도착지는 #126 에서 갈랐다.
  const goMain = () => {
    acknowledgeExpired()
    navigate(loginPath, { replace: true })
  }

  return (
    <SessionExpiredModal open onRelogin={goRelogin} onMainScreen={goMain} />
  )
}
