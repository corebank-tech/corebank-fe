import type { SearchAdminCustomersParams } from "@/shared/api/generated"

/**
 * ADM-01 고객 목록의 조회조건과 서버 요청 파라미터 변환.
 *
 * 상태 필터는 `status` 와 `accountLocked` 두 축을 겹쳐 보므로 조합이 눈으로 확인되는
 * 종류가 아니라, 화면 밖 순수 함수로 두고 테스트한다.
 */

/**
 * 상태 필터. 잠김은 `status` 가 아니라 `accountLocked` 라 별도 선택지로 둔다 —
 * 정지 계정이 잠겨 있을 수도, 정상 계정이 5회 실패로 잠겨 있을 수도 있다.
 */
export type AdminCustomerStatusFilter =
  "all" | "active" | "suspended" | "locked"

export type AdminCustomerSearchCondition = {
  userId: string
  userName: string
  email: string
  status: AdminCustomerStatusFilter
}

export const EMPTY_ADMIN_CUSTOMER_CONDITION: AdminCustomerSearchCondition = {
  userId: "",
  userName: "",
  email: "",
  status: "all",
}

/**
 * 화면 조건을 서버 파라미터로 옮긴다. 빈 문자열은 보내지 않는다 — 서버는 빈 값을
 * 조건 없음으로 보지만, 보내지 않아야 요청 URL 과 캐시 키가 조건과 1:1이 된다.
 *
 * "정상" = 정지도 잠김도 아닌 계정이다. 둘 중 하나라도 걸리면 운영 대상이므로
 * 정상에서 빼야 관리자가 손댈 계정만 추려진다. 서버는 정상(`ACTIVE`)이나
 * 잠김 아님(`false`) 단독 검색을 거부하므로 다른 조건과 함께여야 결과가 나온다.
 */
export const toSearchParams = (
  condition: AdminCustomerSearchCondition,
): SearchAdminCustomersParams => {
  const userId = condition.userId.trim()
  const userName = condition.userName.trim()
  const email = condition.email.trim()

  return {
    ...(userId ? { userId } : {}),
    ...(userName ? { userName } : {}),
    ...(email ? { email } : {}),
    ...(condition.status === "locked" ? { accountLocked: true } : {}),
    ...(condition.status === "suspended" ? { status: "SUSPENDED" } : {}),
    ...(condition.status === "active"
      ? { status: "ACTIVE", accountLocked: false }
      : {}),
  }
}
