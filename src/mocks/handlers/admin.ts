import type { SessionAuthority } from "@/entities/auth"

/**
 * 관리자 권한 목. MSW 의 `GET /customers/me` 가 실어 줄 역할·권한을 계정별로
 * 정한다. 실서버는 같은 모양을 `customer.role`·`admin_permission` 에서 준다(PH-49a).
 *
 * 확정 계약은 `role` + `permissions` 고정 집합 5종이다
 * (`corebank-server/docs/phase2/README.md` §3-4).
 *
 * `MOCK_MEMBERS` 를 건드리지 않고 별도 표로 둔 이유는 그쪽이 A-07·A-08 화면의
 * 고정 데이터라, 권한을 섞으면 무관한 화면의 기대값이 흔들리기 때문이다.
 *
 * - honggildong — 고객. 기존 고객 시나리오가 그대로 돌아야 해서 손대지 않는다
 * - seojunpark  — 전 권한 관리자
 * - dayeonkim   — **조회 전용 관리자.** 직무분리의 절반(권한 없는 쪽)을 이 계정으로
 *   확인한다. `CUSTOMER_READ` 가 있어 고객 메뉴·목록·상세는 보이지만 `CUSTOMER_WRITE`
 *   가 없어 계정 운영 버튼 3종이 렌더링되지 않는다. 지급정지도 조회만 있어 대리
 *   접수 버튼과 판정 확정 입력이 그려지지 않는다
 * - adminapprover — **지급정지 승인 관리자.** 조회와 승인(`PAYMENT_STOP_APPROVE`)만 있다.
 *   수용, 일부 지급정지 판정은 작성자와 다른 관리자가 승인해야 확정되므로(계약 v2 §3)
 *   박서준이 작성한 판정을 이 계정으로 승인해 본다
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
      "PAYMENT_STOP_READ",
      "PAYMENT_STOP_WRITE",
      "PAYMENT_STOP_APPROVE",
    ],
  },
  adminapprover: {
    role: "ADMIN",
    permissions: ["PAYMENT_STOP_READ", "PAYMENT_STOP_APPROVE"],
  },
  dayeonkim: {
    role: "ADMIN",
    permissions: [
      "GL_READ",
      "CUSTOMER_READ",
      "AUDIT_READ",
      "PAYMENT_STOP_READ",
    ],
  },
  minjunlee: {
    role: "ADMIN",
    permissions: ["GL_READ"],
  },
}

export const readMockAuthority = (memberId: string): SessionAuthority =>
  MOCK_AUTHORITIES[memberId] ?? { role: "CUSTOMER", permissions: [] }

/**
 * 계정별 고객 번호. 서버는 로그인과 `GET /customers/me` 에 실제 고객 번호를 준다.
 * 지급정지 판정의 작성자, 승인자가 이 번호로 남아 화면이 "내가 쓴 판정"을 가린다.
 * 고객 계정 운영 목(`admin-customers-api.ts`)의 번호와 맞춘다. 표에 없으면 1이다.
 */
const MOCK_CUSTOMER_IDS: Record<string, number> = {
  honggildong: 1,
  seojunpark: 2,
  dayeonkim: 7,
  minjunlee: 13,
  adminapprover: 14,
}

export const readMockCustomerId = (memberId: string): number =>
  MOCK_CUSTOMER_IDS[memberId] ?? 1
