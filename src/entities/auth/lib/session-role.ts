import {
  ADMIN_PERMISSIONS,
  type AdminPermission,
} from "@/shared/types/admin-permission"

/** 채널 구분. PH-49 의 CUSTOMER / ADMIN 역할 분리. */
export type SessionRole = "CUSTOMER" | "ADMIN"

export type SessionAuthority = {
  role: SessionRole
  /**
   * 직무분리(PH-49). 기능 단위 권한 목록이고, 고객에게는 항상 빈 배열이다.
   * 불리언 하나였던 `canModify` 를 대체한다 — "회계는 볼 수 있지만 고객정보는
   * 못 본다" 같은 구분이 불리언으로는 표현되지 않는다.
   */
  permissions: AdminPermission[]
}

/** 서버가 아직 내려주지 않는 필드. 도착하면 생성 타입에 들어온다. */
type SessionAuthorityFields = {
  role?: string
  permissions?: unknown
}

const isAdminPermission = (value: unknown): value is AdminPermission =>
  typeof value === "string" &&
  (ADMIN_PERMISSIONS as readonly string[]).includes(value)

/**
 * 변경 권한인지. 접미사로 판정하는 이유는 집합이 늘어도 규칙이 유지되기 때문이다 —
 * 새 `*_WRITE` 가 생기면 자동으로 변경 권한으로 잡힌다.
 */
const isWritePermission = (permission: AdminPermission): boolean =>
  permission.endsWith("_WRITE")

/**
 * 배열과 CSV 문자열을 **둘 다** 받는다. DB 는 CSV 컬럼인데 응답이 어느 모양으로
 * 나올지 아직 확정되지 않았다(#147 에서 P1 에게 확인 요청). 확정되면 한쪽을 지운다.
 *
 * 모르는 값은 조용히 버린다 — 서버가 집합을 늘렸는데 FE 가 아직 모르는 상황에서
 * 화면이 깨지는 것보다, 그 권한이 없는 것으로 보는 쪽이 안전하다.
 */
const readPermissionList = (raw: unknown): AdminPermission[] => {
  const candidates =
    typeof raw === "string" ? raw.split(",") : Array.isArray(raw) ? raw : []

  const known = candidates
    .map((value) => (typeof value === "string" ? value.trim() : value))
    .filter(isAdminPermission)

  // CSV 에 같은 값이 두 번 들어오는 경우를 흡수한다.
  return Array.from(new Set(known))
}

/**
 * 세션의 역할·권한을 판정하는 **유일한 자리**.
 *
 * `GET /customers/me` 응답에 아직 역할·권한 필드가 없어(2026-09-18 기준) 값이
 * 없으면 CUSTOMER + 권한 없음으로 떨어진다. 서버 구현(PH-49a, 10/8)이 오면
 * 이 함수 안만 바꾸면 된다.
 *
 * 판정을 화면마다 흩뿌리지 않는 이유가 그것이다 — 관리자 화면들이 각자
 * `permissions.includes(...)` 를 계산하기 시작하면 전부 찾아 고쳐야 한다.
 * 화면은 `hasPermission` 을 거친다.
 */
export const readSessionAuthority = (profile: unknown): SessionAuthority => {
  const fields = (profile ?? {}) as SessionAuthorityFields
  const role: SessionRole = fields.role === "ADMIN" ? "ADMIN" : "CUSTOMER"

  // 권한은 관리자에게만 의미가 있다. 고객 채널은 자기 자원만 다루므로 직무분리
  // 대상이 아니고, 권한 값이 새어 들어와도 승격되지 않는다.
  if (role !== "ADMIN") return { role, permissions: [] }

  return { role, permissions: readPermissionList(fields.permissions) }
}

/** 화면이 특정 권한을 묻는 자리. 없는 권한이면 버튼·메뉴를 그리지 않는다. */
export const hasPermission = (
  permissions: AdminPermission[],
  required: AdminPermission,
): boolean => permissions.includes(required)

/**
 * 변경 권한을 하나라도 가졌는지. 셸 헤더의 "변경 가능 / 조회 전용" 배지처럼
 * **기능을 특정하지 않는 자리**에서만 쓴다. 액션 버튼은 반드시 그 기능의 권한을
 * 직접 묻는다 — `GL_WRITE` 만 가진 관리자에게 고객 정지 버튼이 보이면 안 된다.
 */
export const hasAnyWritePermission = (
  permissions: AdminPermission[],
): boolean => permissions.some(isWritePermission)
