/**
 * 관리자 기능 권한. 2차 확정 계약의 고정 집합이다
 * (`corebank-server/plans/260916-corebank-phase2-v3/00-프로젝트-개요.md` §7).
 *
 * > 관리자 인증 — `customer.role`(CUSTOMER/ADMIN) + `permissions` CSV 컬럼
 * > (고정 집합 `GL_READ·GL_WRITE·CUSTOMER_READ·CUSTOMER_WRITE·AUDIT_READ`)
 *
 * **`entities/auth` 가 아니라 `shared/types` 에 둔다.** 관리자 네비 설정
 * (`shared/config/admin-nav.ts`)이 항목마다 필요한 권한을 선언하는데, FSD-lite 의
 * 의존 방향이 `entities → shared` 라 `shared` 가 `entities` 를 import 할 수 없다.
 * 같은 이유로 `shared/types/account.ts` 가 이미 있다.
 *
 * **판정은 여기 없다.** 세션 응답을 읽어 권한을 정하는 일은
 * `entities/auth/lib/session-role.ts` 한 곳뿐이다 — 여기 있는 것은 이름의 목록이다.
 */
export const ADMIN_PERMISSIONS = [
  "GL_READ",
  "GL_WRITE",
  "CUSTOMER_READ",
  "CUSTOMER_WRITE",
  "AUDIT_READ",
] as const

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]

/**
 * 변경 권한인지. 접미사로 판정하는 이유는 집합이 늘어도 규칙이 유지되기 때문이다 —
 * 새 `*_WRITE` 가 생기면 자동으로 변경 권한으로 잡힌다.
 */
export const isWritePermission = (permission: AdminPermission): boolean =>
  permission.endsWith("_WRITE")
