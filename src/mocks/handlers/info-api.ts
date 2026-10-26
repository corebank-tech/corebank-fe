import { delay, http } from "msw"
import type {
  DepositBalanceItem,
  DepositBalancesResponse,
  ProductSubscriptionsResponse,
} from "@/shared/api/generated"
import { requireMockPermission } from "@/mocks/handlers/auth"
import { ok } from "@/mocks/lib/envelope"
import { daysAgo } from "@/shared/lib/mock-date"

const MOCK_LATENCY_MS = 200

/** 어제까지 적재가 끝난 상태. 정보계는 COB 마감 뒤에 적재한다. */
const AS_OF = daysAgo(1)

/** asOf 를 포함한 최근 5일. 화면은 asOf 하루만 쓴다. */
const BALANCES: DepositBalanceItem[] = [5, 4, 3, 2, 1].map((n, i) => ({
  baseDate: daysAgo(n),
  totalBalance: 1_520_000_000_000 + i * 850_000_000,
}))

const DEPOSIT_BALANCES: DepositBalancesResponse = {
  asOf: AS_OF,
  items: BALANCES,
}

const PRODUCT_SUBSCRIPTIONS: ProductSubscriptionsResponse = {
  asOf: AS_OF,
  month: AS_OF.slice(0, 7),
  subscribedCount: 120,
  closedCount: 5,
  items: [
    {
      productId: 3,
      productCode: "DEP-12M",
      productName: "쏠편한 정기예금",
      productGroup: "DEPOSIT",
      subscribedCount: 80,
      closedCount: 3,
    },
    {
      productId: 5,
      productCode: "SAV-12M",
      productName: "쏠편한 정기적금",
      productGroup: "SAVINGS",
      subscribedCount: 40,
      closedCount: 2,
    },
  ],
}

/**
 * ADM-03 정보계 조회 API(PH-77) MSW 목. 서버와 같이 `GL_READ` 로 막는다(D-09).
 *
 * 적재가 끝난 상태 하나만 둔다. 화면이 기간·달을 보내지 않으므로 그 파라미터는
 * 읽지 않는다. 적재 이력 없음(`asOf` null)·정보계 연결 실패(INF9001)는 화면
 * 테스트가 응답을 바꿔 끼워 본다(`adm03-info-dashboard.test.tsx`).
 */
export const infoApiHandlers = [
  http.get("*/admin/info/deposit-balances", async () => {
    await delay(MOCK_LATENCY_MS)
    return requireMockPermission("GL_READ") ?? ok(DEPOSIT_BALANCES)
  }),
  http.get("*/admin/info/product-subscriptions", async () => {
    await delay(MOCK_LATENCY_MS)
    return requireMockPermission("GL_READ") ?? ok(PRODUCT_SUBSCRIPTIONS)
  }),
]
