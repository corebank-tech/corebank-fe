import { Outlet } from "react-router"
import { PageShell } from "@/app/page-shell"
import { RequireAuth } from "@/app/require-auth"
import { useShellProps } from "@/app/routes/shell-handle"

/** 인증이 필요 없는 화면(로그인·회원가입·계정찾기)의 셸. */
export const PublicShellLayout = () => {
  const shell = useShellProps()

  return (
    <PageShell {...shell}>
      <Outlet />
    </PageShell>
  )
}

/**
 * 인증이 필요한 화면의 셸. RequireAuth 가 PageShell **바깥**이다 —
 * 안쪽에 두면 세션 복원 중이나 로그인 화면으로 튕기기 직전에
 * 헤더·푸터만 먼저 그려져 화면이 한 번 번쩍인다.
 */
export const AuthedShellLayout = () => {
  const shell = useShellProps()

  return (
    <RequireAuth>
      <PageShell {...shell}>
        <Outlet />
      </PageShell>
    </RequireAuth>
  )
}
