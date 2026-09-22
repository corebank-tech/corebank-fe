import type { AdminPermission } from "@/shared/types/admin-permission"

/**
 * 권한 코드의 화면 표기. 코드만 띄우면 관리자가 `GL_READ` 가 무엇인지 알 수 없다.
 *
 * 관리자 홈이 로컬 상수로 들고 있던 것을 옮겼다 — 그 자리에 "한 화면에서만 쓰므로
 * 공용으로 빼지 않는다. 다른 화면이 같은 표기를 필요로 할 때 `entities` 로 옮긴다"는
 * 조건이 적혀 있었고, 권한 부족 안내(`AdminForbidden`)가 두 번째 소비자가 되면서
 * 그 조건이 충족됐다.
 */
export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  GL_READ: "회계 조회",
  GL_WRITE: "회계 변경",
  CUSTOMER_READ: "고객 조회",
  CUSTOMER_WRITE: "고객 변경",
  AUDIT_READ: "감사 조회",
}
