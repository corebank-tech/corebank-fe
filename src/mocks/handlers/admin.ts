import type { SessionAuthority } from "@/entities/auth"

/**
 * 관리자 권한 목. 서버가 세션 응답에 역할 필드를 내려주기 전까지 이걸로 대신한다
 * (BE 요청 문서 `plans/260910-phase2-fe/요청-역할필드.md`).
 *
 * `MOCK_MEMBERS` 를 건드리지 않고 별도 표로 둔 이유는 그쪽이 A-07·A-08 화면의
 * 고정 데이터라, 권한을 섞으면 무관한 화면의 기대값이 흔들리기 때문이다.
 *
 * - honggildong — 고객. 기존 고객 시나리오가 그대로 돌아야 해서 손대지 않는다
 * - seojunpark  — 변경 권한이 있는 관리자
 */
const MOCK_AUTHORITIES: Record<string, SessionAuthority> = {
  seojunpark: { role: "ADMIN", canModify: true },
}

export const readMockAuthority = (memberId: string): SessionAuthority =>
  MOCK_AUTHORITIES[memberId] ?? { role: "CUSTOMER", canModify: false }
