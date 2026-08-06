/** F-01 고객정보 조회/변경 mock 데이터. */

export type CustomerProfile = {
  name: string
  userId: string
  /** ISO date (YYYY-MM-DD) */
  dob: string
  /** 11-digit raw phone number, no separators */
  phone: string
  email: string
  /** Mock 평문 저장. 실제 구현은 단방향 해시(REQ-AUTH-027)로 대체된다. */
  currentPassword: string
}

export const MOCK_PROFILE: CustomerProfile = {
  name: "홍길동",
  userId: "honggildong01",
  dob: "1990-05-14",
  phone: "01098765432",
  email: "honggildong1@corebank.co.kr",
  currentPassword: "Corebank12!",
}

/** 다른 회원이 이미 사용 중인 이메일(Mock 중복확인용). REQ-MYPG-002 */
export const MOCK_REGISTERED_EMAILS = [
  "taken@corebank.co.kr",
  "existing0001@example.com",
]
