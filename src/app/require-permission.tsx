import type React from "react"
import { hasPermission, type AdminPermission } from "@/entities/auth"
import { useSession } from "@/features/session"
// 슬라이스 공개 API(배럴)로 가져온다 — `app → pages` 는 `index.ts` 를 통해서만
// 허용된다(`eslint.config.js` 의 `allowTo("app", [...], "index.ts")`).
// 청크가 늘지는 않는다. 이 가드를 부르는 `guardedLazy` 의 콜백들이 이미 같은
// 배럴을 `await import("@/pages/admin")` 로 부르고 있다.
import { AdminForbidden } from "@/pages/admin"

/**
 * 화면 단위 권한 경계(REQ-ADM-004).
 *
 * `RequireAdmin` 이 채널 경계(역할)를 막고, 이 컴포넌트가 화면 경계(권한)를 막는다.
 * 둘을 나눈 이유는 사용자가 할 수 있는 일이 다르기 때문이다 — 역할 미달은 계정을
 * 바꿔야 하고, 권한 부족은 지금 계정 그대로 권한을 받아야 한다.
 *
 * **메뉴를 숨기는 것만으로는 부족하다.** 네비 필터(`widgets/admin-shell/visible-nav.ts`)는
 * 주소창으로 들어오는 경로를 막지 못한다. 이 가드가 생기기 전까지 `CUSTOMER_READ` 가
 * 없는 관리자가 `/admin/customers` 를 직접 열면 고객 목록이 그대로 그려졌다.
 *
 * 셸 **안쪽**에 선다(`AdminShellLayout` 의 `Outlet` 아래). 막힌 화면에서도 네비가
 * 남아야 관리자가 자기가 볼 수 있는 다른 화면으로 옮겨갈 수 있다.
 */
export const RequirePermission = ({
  permission,
  children,
}: {
  permission: AdminPermission
  children: React.ReactElement
}) => {
  const { permissions } = useSession()

  if (!hasPermission(permissions, permission)) {
    return <AdminForbidden missingPermission={permission} />
  }

  return children
}
