export type {
  AdminCustomer,
  AdminCustomerStatus,
} from "@/entities/admin-customer/api/adm01-customers"

export type {
  AdminCustomerSearchCondition,
  AdminCustomerStatusFilter,
} from "@/entities/admin-customer/lib/filter-customers"
export {
  EMPTY_ADMIN_CUSTOMER_CONDITION,
  filterCustomers,
} from "@/entities/admin-customer/lib/filter-customers"

/**
 * `MOCK_ADMIN_CUSTOMERS` 는 내보내지 않는다. 저장소가 변경 시 배열을 통째로
 * 교체하므로, 상수를 직접 읽으면 **변경 전 스냅샷**을 보게 된다. 목 데이터에
 * 닿는 경로를 저장소 하나로 묶어 둔다.
 */
export {
  findAdminCustomer,
  readAdminCustomers,
  updateAdminCustomer,
} from "@/entities/admin-customer/model/admin-customer-store"
