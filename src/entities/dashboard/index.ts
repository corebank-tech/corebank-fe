export type {
  DashboardAccount,
  NotificationCategory,
  NotificationItem,
} from "@/entities/dashboard/api/dashboard"
export {
  MOCK_DASHBOARD_ACCOUNTS,
  MOCK_NOTIFICATIONS,
} from "@/entities/dashboard/api/dashboard"

export type { LoginStatusResponse } from "@/entities/dashboard/api/login-status"
export {
  getLoginStatusQueryKey,
  useLoginStatusQuery,
} from "@/entities/dashboard/api/login-status"
