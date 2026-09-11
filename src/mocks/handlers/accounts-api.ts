import { delay, http } from "msw"
import type { AccountOverviewResponse } from "@/shared/api/generated"
import { daysAgo } from "@/shared/lib/mock-date"
import { ok } from "@/mocks/lib/envelope"

const MOCK_LATENCY_MS = 200

/**
 * `GET /accounts` 목. e2e 가 전체계좌조회(B-01)를 밟게 한다.
 *
 * 기존 `handlers/account.ts` 는 와일드카드 + `/api/accounts` 경로를 쓰는 customFetch
 * 계약 예시라, 실제 경로(`{VITE_API_BASE_URL}/accounts` = `/api/v1/accounts`)에
 * 걸리지 않는다. 그래서 B-01 이 e2e 에서 늘 네트워크 오류 화면으로 떨어져 있었다.
 *
 * 최근거래일은 상대 날짜로 둔다 — 고정 날짜면 기본 조회기간(POL-021) 밖으로
 * 밀려난다(`shared/lib/mock-date.ts`).
 */
const overview = (): AccountOverviewResponse => ({
  asOf: `${daysAgo(0)}T09:00:00`,
  totalAssets: 17_700_500,
  items: [
    {
      groupCode: "DEMAND_DEPOSIT",
      groupName: "입출금",
      groupTotalBalance: 17_700_500,
      accounts: [
        {
          accountId: 1,
          accountName: "자유입출금",
          accountNumber: "110632892336",
          accountType: "DEMAND_DEPOSIT",
          status: "ACTIVE",
          balance: 12_340_500,
          openedDate: "2021-03-14",
          lastTransactionAt: `${daysAgo(0)}T09:12:40`,
          maturityDate: null,
          withdrawalRegistered: true,
          transferEnabled: true,
        },
        {
          accountId: 2,
          accountName: "급여통장",
          accountNumber: "302998112233",
          accountType: "DEMAND_DEPOSIT",
          status: "ACTIVE",
          balance: 3_860_000,
          openedDate: "2019-11-02",
          lastTransactionAt: `${daysAgo(1)}T19:12:47`,
          maturityDate: null,
          withdrawalRegistered: true,
          transferEnabled: true,
        },
        {
          accountId: 3,
          accountName: "비상금통장",
          accountNumber: "255104778910",
          accountType: "DEMAND_DEPOSIT",
          status: "ACTIVE",
          balance: 1_500_000,
          openedDate: "2023-06-20",
          lastTransactionAt: `${daysAgo(5)}T14:03:15`,
          maturityDate: null,
          withdrawalRegistered: false,
          transferEnabled: true,
        },
      ],
    },
  ],
})

export const accountsApiHandlers = [
  http.get("*/accounts", async () => {
    await delay(MOCK_LATENCY_MS)
    return ok(overview())
  }),
]
