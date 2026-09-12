export type AdminNavItem = {
  label: string
  path: string
  /**
   * 변경 권한이 있어야 보이는 항목. 직무분리(PH-49)에서 조회 전용 관리자에게는
   * 메뉴 자체를 그리지 않는다 — 눌러서 서버 거부를 받는 건 이미 늦다.
   */
  requiresModify?: boolean
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
]
