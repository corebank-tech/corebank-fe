import type { AdminPermission } from "@/shared/types/admin-permission"

export type AdminNavItem = {
  label: string
  path: string
  /**
   * 이 항목을 보려면 필요한 권한. 직무분리(PH-49)에서 권한이 없는 관리자에게는
   * 메뉴 자체를 그리지 않는다 — 눌러서 서버 거부를 받는 건 이미 늦다.
   *
   * 불리언(`requiresModify`)이 아니라 **기능 단위 권한**을 적는다. "변경 권한이
   * 있는가"만으로는 `GL_WRITE` 만 가진 관리자에게 고객 메뉴가 열린다.
   */
  requiresPermission?: AdminPermission
}

export type AdminNavGroup = {
  title: string
  items: AdminNavItem[]
}

/**
 * 관리자 네비. 화면이 붙는 이슈마다 항목이 늘어난다.
 * 아직 만들지 않은 화면은 올리지 않는다 — 죽은 링크가 되기 때문이다.
 */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    title: "관리",
    items: [{ label: "관리자 홈", path: "/admin" }],
  },
  {
    title: "고객",
    items: [
      {
        label: "고객 계정 운영",
        path: "/admin/customers",
        // 조회 자체는 CUSTOMER_READ 로 충분하다. 변경 액션은 화면 안에서
        // CUSTOMER_WRITE 를 따로 묻는다.
        requiresPermission: "CUSTOMER_READ",
      },
    ],
  },
  {
    title: "회계",
    items: [
      {
        label: "시산표",
        path: "/admin/trial-balance",
        // 시산표는 조회 전용이다. `GL_WRITE` 는 결산·역분개가 붙을 때 쓰이는데
        // 그 화면(#129)은 2차 범위 밖이라 이 그룹에 변경 항목이 없다.
        requiresPermission: "GL_READ",
      },
    ],
  },
]
