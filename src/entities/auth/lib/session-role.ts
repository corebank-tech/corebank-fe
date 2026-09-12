/** 채널 구분. PH-49 의 CUSTOMER / ADMIN 역할 분리. */
export type SessionRole = "CUSTOMER" | "ADMIN"

export type SessionAuthority = {
  role: SessionRole
  /** 직무분리(PH-49). 조회 권한과 변경 권한이 갈린다. 조회 전용이면 false. */
  canModify: boolean
}

/** 서버가 아직 내려주지 않는 필드. 도착하면 생성 타입에 들어온다. */
type SessionAuthorityFields = {
  role?: string
  canModify?: boolean
}

/**
 * 세션의 역할·권한을 판정하는 **유일한 자리**.
 *
 * `GET /customers/me` 응답에 아직 역할 필드가 없어(2026-09-10 기준) 값이 없으면
 * CUSTOMER 로 떨어진다. 서버가 필드를 내려주기 시작하면 이 함수 안만 바꾸면 되고,
 * 필드명이 `permissions: string[]` 같은 다른 모양으로 와도 마찬가지다.
 *
 * 판정을 화면마다 흩뿌리지 않는 이유가 그것이다 — 관리자 화면 20여 개가
 * 각자 `role === "ADMIN"` 을 계산하기 시작하면 전부 찾아 고쳐야 한다.
 */
export const readSessionAuthority = (profile: unknown): SessionAuthority => {
  const fields = (profile ?? {}) as SessionAuthorityFields
  const role: SessionRole = fields.role === "ADMIN" ? "ADMIN" : "CUSTOMER"

  // 변경 권한은 관리자에게만 의미가 있다. 고객 채널은 자기 자원만 다루므로
  // 직무분리 대상이 아니다.
  return { role, canModify: role === "ADMIN" && fields.canModify === true }
}
