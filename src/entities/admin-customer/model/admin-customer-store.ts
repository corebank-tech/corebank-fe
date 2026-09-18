import {
  MOCK_ADMIN_CUSTOMERS,
  type AdminCustomer,
} from "@/entities/admin-customer/api/adm01-customers"

/**
 * 목 데이터의 변경을 화면 사이에 이어 주는 저장소.
 *
 * 목록(`/admin/customers`)과 상세(`/admin/customers/:customerId`)가 별도 라우트라,
 * 상세에서 잠금을 풀어도 상수 배열을 그대로 읽으면 목록으로 돌아왔을 때 그대로다.
 *
 * 구독(`useSyncExternalStore`)을 붙이지 않는다 — 두 화면은 라우트가 갈려 동시에
 * 떠 있을 수 없고, 목록은 마운트 시점에 다시 읽으므로 그것으로 충분하다. 상세는
 * 자기 지역 상태로 다시 그린다.
 *
 * MSW 목의 `mocks/lib/mock-store.ts` 와 달리 sessionStorage 를 쓰지 않는다. 그쪽은
 * 핸들러가 새로고침을 견뎌야 하지만, 여기는 화면이 직접 들고 도는 값이라 새로고침에
 * 처음 상태로 돌아가는 편이 목 데이터로서 더 다루기 쉽다.
 *
 * 실 API(PH-97)가 오면 이 파일은 통째로 사라지고 `entities` 의 조회·변경 훅이 그 자리에 온다.
 */
let customers: AdminCustomer[] = MOCK_ADMIN_CUSTOMERS

export const readAdminCustomers = (): AdminCustomer[] => customers

export const findAdminCustomer = (
  customerId: number,
): AdminCustomer | undefined =>
  customers.find((customer) => customer.customerId === customerId)

/** 한 건을 부분 갱신하고 갱신된 값을 돌려준다. 없는 고객이면 `undefined`. */
export const updateAdminCustomer = (
  customerId: number,
  patch: Partial<AdminCustomer>,
): AdminCustomer | undefined => {
  let updated: AdminCustomer | undefined
  customers = customers.map((customer) => {
    if (customer.customerId !== customerId) return customer
    updated = { ...customer, ...patch }
    return updated
  })
  return updated
}
