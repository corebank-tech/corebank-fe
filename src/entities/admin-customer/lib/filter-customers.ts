import type { AdminCustomer } from "@/entities/admin-customer/api/adm01-customers"

/**
 * ADM-01 고객 목록의 조회조건과 필터링.
 *
 * 화면 파일 안에 두면 순수 함수인데도 export 되지 않아 테스트할 수 없다 —
 * 상태 필터는 `status` 와 `accountLocked` 두 축을 겹쳐 보므로 조합이 눈으로
 * 확인되는 종류가 아니다.
 *
 * 실 API(PH-97)가 오면 이 조건은 요청 파라미터로 나가고 필터링은 서버가 한다.
 * 그때 사라지는 것은 `filterCustomers` 뿐이고 `AdminCustomerSearchCondition` 은
 * 그대로 요청 파라미터의 모양이 된다.
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

const matchesStatus = (
  customer: AdminCustomer,
  status: AdminCustomerStatusFilter,
): boolean => {
  if (status === "all") return true
  if (status === "locked") return customer.accountLocked
  if (status === "suspended") return customer.status === "SUSPENDED"
  // 정상 = 정지도 잠김도 아닌 계정. 둘 중 하나라도 걸리면 운영 대상이므로
  // "정상"에서 빼야 관리자가 손댈 계정만 추려진다.
  return customer.status === "ACTIVE" && !customer.accountLocked
}

/** 조건 전부를 AND 로 적용한다. 문자열 조건은 부분일치이고 앞뒤 공백은 버린다. */
export const filterCustomers = (
  customers: AdminCustomer[],
  condition: AdminCustomerSearchCondition,
): AdminCustomer[] => {
  const userId = condition.userId.trim().toLowerCase()
  const userName = condition.userName.trim()
  const email = condition.email.trim().toLowerCase()

  return customers.filter((customer) => {
    if (userId && !customer.userId.toLowerCase().includes(userId)) return false
    if (userName && !customer.userName.includes(userName)) return false
    if (email && !customer.email.toLowerCase().includes(email)) return false
    return matchesStatus(customer, condition.status)
  })
}
