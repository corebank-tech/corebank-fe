/**
 * 관리자 고객 개인정보 조회·변경 사유(POL-A09, 서버 PH-89 `AccessReason`).
 *
 * 고객 검색, 상세, 변경 요청마다 `X-Access-Reason` 헤더로 코드를 보낸다. 자유기재는
 * 없다. 헤더에 한글을 담을 수 없어 코드만 보내고 화면은 라벨을 보여준다.
 */
export const ACCESS_REASON_HEADER = "X-Access-Reason"

export const ACCESS_REASONS = [
  { code: "CUSTOMER_REQUEST", label: "고객 요청" },
  { code: "INCIDENT", label: "사고·민원 대응" },
  { code: "AUDIT", label: "감사·점검" },
  { code: "OPERATION", label: "운영 확인" },
] as const

export type AccessReason = (typeof ACCESS_REASONS)[number]["code"]

/** 주소창 값처럼 밖에서 들어온 문자열이 정의된 코드인지 가린다. */
export const isAccessReason = (value: unknown): value is AccessReason =>
  ACCESS_REASONS.some((reason) => reason.code === value)

/** 서버가 사유 누락이나 미정의 코드로 거부할 때의 코드(PH-89). */
export const ACCESS_REASON_INVALID_CODE = "CMN0007"
