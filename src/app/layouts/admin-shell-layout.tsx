import { Outlet } from "react-router"
import { RequireAdmin } from "@/app/require-admin"
import { useShellProps } from "@/app/routes/shell-handle"
import { AdminShell } from "@/widgets/admin-shell"

/**
 * 관리자 화면의 셸. 고객 쪽 `AuthedShellLayout` 과 같은 모양이다 —
 * 가드가 셸 바깥이고, 셸 메타는 라우트 `handle` 에서 읽는다.
 */
export const AdminShellLayout = () => {
  const shell = useShellProps()

  return (
    <RequireAdmin>
      <AdminShell title={shell.title}>
        <Outlet />
      </AdminShell>
    </RequireAdmin>
  )
}
