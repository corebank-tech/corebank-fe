import { hasPermission, type AdminPermission } from "@/entities/auth"
import type { AdminNavGroup } from "@/shared/config/admin-nav"

/**
 * 권한으로 관리자 네비를 거른다.
 *
 * 셸 안에 인라인으로 두면 **거르는 분기를 테스트할 수 없다.** 실제로 그 상태로
 * 한 번 나갔다 — `requiresPermission` 이 붙은 항목이 하나뿐이고 목 관리자 둘 다
 * 그 권한을 갖고 있어서, 필터를 통째로 지워도 화면과 e2e 가 전부 통과했다.
 * 직무분리(PH-49)의 장치가 작동하는지가 이 함수의 테스트로 증명된다.
 *
 * 항목이 하나도 남지 않은 그룹은 제목만 남지 않도록 통째로 뺀다.
 */
export const visibleAdminNav = (
  groups: AdminNavGroup[],
  permissions: AdminPermission[],
): AdminNavGroup[] =>
  groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !item.requiresPermission ||
          hasPermission(permissions, item.requiresPermission),
      ),
    }))
    .filter((group) => group.items.length > 0)
