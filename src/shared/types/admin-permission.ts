/**
 * 관리자 기능 권한. 2차 확정 계약의 고정 집합이다
 * (`corebank-server/docs/phase2/README.md` §3-4).
 *
 * > 모델: `customer.role` + `permissions` CSV. 권한은 고정 5종
 * > (`GL_READ · GL_WRITE · CUSTOMER_READ · CUSTOMER_WRITE · AUDIT_READ`)이다.
 *
 * **`entities/auth` 가 아니라 `shared/types` 에 둔다.** 관리자 네비 설정
 * (`shared/config/admin-nav.ts`)이 항목마다 필요한 권한을 선언하는데, FSD-lite 의
 * 의존 방향이 `entities → shared` 라 `shared` 가 `entities` 를 import 할 수 없다.
 * 같은 이유로 `shared/types/account.ts` 가 이미 있다.
 *
 * **여기 있는 것은 이름의 목록뿐이다.** 권한을 읽고 판정하는 일(응답 파싱,
 * 보유 여부, 변경 권한 여부)은 전부 `entities/auth/lib/session-role.ts` 에 있다.
 * 상수가 함께 있는 이유는 타입이 그것에서 파생되기 때문이다.
 */
export const ADMIN_PERMISSIONS = [
  "GL_READ",
  "GL_WRITE",
  "CUSTOMER_READ",
  "CUSTOMER_WRITE",
  "AUDIT_READ",
] as const

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]
