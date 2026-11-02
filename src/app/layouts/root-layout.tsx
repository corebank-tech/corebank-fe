import { Outlet } from "react-router"
import { DevNav } from "@/app/dev-nav"
import { SessionExpiredGate } from "@/app/session-expired-gate"
import { NotificationsProvider } from "@/features/notifications"
import { SessionProvider } from "@/features/session"

/**
 * 라우트 트리 최상단. 세션·알림 프로바이더가 여기 있는 이유는 데이터 라우터에서
 * 라우터 컨텍스트가 `RouterProvider` 안쪽부터 살아 있기 때문이다 —
 * `main.tsx` 에 두면 SessionExpiredGate 의 `useNavigate` 가 라우터를 찾지 못한다.
 */
export const RootLayout = () => (
  <SessionProvider>
    <NotificationsProvider>
      {/* 개발용 화면 목록. 프로덕션 빌드에서 제외된다. */}
      {import.meta.env.DEV && <DevNav />}
      <SessionExpiredGate />
      <Outlet />
    </NotificationsProvider>
  </SessionProvider>
)
