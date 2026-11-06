import type { SessionAuthority } from "@/entities/auth"

/**
 * 관리자 권한 목. MSW 의 `GET /customers/me` 가 실어 줄 역할·권한을 계정별로
 * 정한다. 실서버는 같은 모양을 `customer.role`·`admin_permission` 에서 준다(PH-49a).
 *
 * 확정 계약은 `role` + `permissions` 고정 집합 5종이다
 * (`corebank-server/docs/phase2/README.md` §3-4).
 *
 * `MOCK_MEMBERS`는 회원가입·로그인 목업 및 MSW 테스트에서도 사용하므로,
 * 관리자 권한은 별도 표로 유지한다.
 * 권한을 기존 회원 데이터에 섞으면 다른 테스트의 기대값이 달라질 수 있다.
 *
 * - honggildong — 고객. 기존 고객 시나리오가 그대로 돌아야 해서 손대지 않는다
 * - seojunpark  — 전 권한 관리자
 * - dayeonkim   — **조회 전용 관리자.** 직무분리의 절반(권한 없는 쪽)을 이 계정으로
 *   확인한다. `CUSTOMER_READ` 가 있어 고객 메뉴·목록·상세는 보이지만 `CUSTOMER_WRITE`
 *   가 없어 계정 운영 버튼 3종이 렌더링되지 않는다
 * - minjunlee   — **회계 전용 관리자(#156).** `GL_READ` 하나뿐이라 고객 화면 자체가
 *   막힌다. 위 둘은 두 관리자 화면 어디에도 걸리지 않아, 화면 단위 권한 게이트
 *   (REQ-ADM-004)가 URL 직접 접근을 막는지 확인할 수단이 이 계정뿐이다
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
  minjunlee: {
    role: "ADMIN",
    permissions: ["GL_READ"],
  },
}

export const readMockAuthority = (memberId: string): SessionAuthority =>
  MOCK_AUTHORITIES[memberId] ?? { role: "CUSTOMER", permissions: [] }
