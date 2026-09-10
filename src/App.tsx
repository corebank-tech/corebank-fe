import { Routes, useNavigate } from "react-router"
import { DevNav } from "@/app/dev-nav"
import { customerRoutes } from "@/app/routes/customer-routes"
import { useSession } from "@/features/session"
import { SessionExpiredModal } from "@/entities/auth"

/**
 * A-11 세션 만료. SessionProvider의 10분 무조작 타이머가 만료되면 전 화면
 * 위에 비해제형 모달을 띄운다(REQ-AUTH-031).
 */
const SessionExpiredGate = () => {
  const { expiredReason, acknowledgeExpired } = useSession()
  const navigate = useNavigate()

  if (expiredReason == null) return null

  const goRelogin = () => {
    acknowledgeExpired()
    navigate("/", { replace: true })
  }
  // 만료 후에는 대시보드가 RequireAuth 에 막히므로 어차피 로그인 화면으로 튕긴다.
  // 튕겨서 도착하게 두면 버튼이 먹지 않는 것처럼 보여, 도착지를 명시한다
  // (REQ-AUTH-031 이 버튼 2개를 요구하므로 버튼 자체는 유지한다).
  // [다시 로그인]과 결과가 같아지는 것은 라벨 불일치가 아니라, "메인화면"을
  // 인증 여부와 무관한 앱의 시작 지점(`/`)으로 해석한 결과다 — 만료 상태에서
  // 그 시작 지점이 로그인 화면인 것은 RequireAuth 의 정상 동작이다. #95 에서 확정(2026-08-24).
  const goMain = () => {
    acknowledgeExpired()
    navigate("/", { replace: true })
  }

  return (
    <SessionExpiredModal open onRelogin={goRelogin} onMainScreen={goMain} />
  )
}

const App = () => {
  return (
    <>
      {/* Dev-only route switcher (not part of the design system). 프로덕션 빌드에서 제외된다. */}
      {import.meta.env.DEV && <DevNav />}
      <SessionExpiredGate />

      <Routes>{customerRoutes}</Routes>
    </>
  )
}

export default App
