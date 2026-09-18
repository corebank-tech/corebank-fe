import type { SessionAuthority } from "@/entities/auth"

/**
 * 관리자 권한 목. 서버가 세션 응답에 역할·권한 필드를 내려주기 전까지 이걸로
 * 대신한다(PH-49a 구현 10/8, #147).
 *
 * 확정 계약은 `role` + `permissions` 고정 집합 5종이다
 * (`corebank-server/plans/260916-corebank-phase2-v3/00-프로젝트-개요.md` §7).
 *
 * `MOCK_MEMBERS` 를 건드리지 않고 별도 표로 둔 이유는 그쪽이 A-07·A-08 화면의
 * 고정 데이터라, 권한을 섞으면 무관한 화면의 기대값이 흔들리기 때문이다.
 *
 * - honggildong — 고객. 기존 고객 시나리오가 그대로 돌아야 해서 손대지 않는다
 * - seojunpark  — 전 권한 관리자
 * - dayeonkim   — **조회 전용 관리자.** 직무분리의 절반(권한 없는 쪽)을 이 계정으로
 *   확인한다. `CUSTOMER_READ` 가 있어 고객 메뉴·목록·상세는 보이지만 `CUSTOMER_WRITE`
 *   가 없어 계정 운영 버튼 3종이 렌더링되지 않는다
 */
const MOCK_AUTHORITIES: Record<string, SessionAuthority> = {
  seojunpark: {
    role: "ADMIN",
    permissions: [
      "GL_READ",
      "GL_WRITE",
      "CUSTOMER_READ",
      "CUSTOMER_WRITE",
      "AUDIT_READ",
    ],
  },
  dayeonkim: {
    role: "ADMIN",
    permissions: ["GL_READ", "CUSTOMER_READ", "AUDIT_READ"],
  },
}

export const readMockAuthority = (memberId: string): SessionAuthority =>
  MOCK_AUTHORITIES[memberId] ?? { role: "CUSTOMER", permissions: [] }
