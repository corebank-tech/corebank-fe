import { delay, http } from "msw"
import {
  MOCK_OVERVIEW_ACCOUNTS,
  type OverviewAccount,
} from "@/entities/account"
import { MOCK_MEMBERS } from "@/entities/auth"
import type {
  AccountItemResponse,
  AccountOverviewResponse,
  GroupResponse,
} from "@/shared/api/generated"
import { getToday } from "@/shared/config/clock"
import { readSignedInMemberId, unauthorized } from "@/mocks/handlers/auth"
import { ok } from "@/mocks/lib/envelope"

const MOCK_LATENCY_MS = 200

/**
 * `GET /accounts` 목. 전체계좌조회(B-01)·예적금 계좌조회(B-02)·대시보드(A-09)가
 * 모두 이 응답 하나를 쓴다. 계좌 ID 로 계좌를 찾는 다른 목(계좌비밀번호 검증·상품가입
 * 출금계좌)도 `findMockAccount` 로 여기서 읽는다.
 *
 * 값을 여기 다시 적지 않고 `MOCK_OVERVIEW_ACCOUNTS` 를 변환한다 — 계좌번호·잔액을
 * 두 파일에 손으로 맞춰 두면 한쪽만 고쳐도 아무 테스트가 깨지지 않는다
 * (`b01-accounts.test.ts` 는 정본 쪽만 검증한다).
 *
 * 기존 `handlers/account.ts` 는 와일드카드 + `/api/accounts` 경로를 쓰는 customFetch
 * 계약 예시라 실제 경로(`{VITE_API_BASE_URL}/accounts`)에 걸리지 않는다.
 */

/** 정본 픽스처의 그룹 구분을 API 그룹 코드로 옮긴다. */
const GROUPS = [
  { id: "checking", code: "DEMAND_DEPOSIT", name: "입출금" },
  { id: "deposit", code: "DEPOSIT_SAVINGS", name: "예금·적금" },
] as const

const toAccountItem = (
  account: OverviewAccount,
  index: number,
): AccountItemResponse => ({
  // 정본에는 문자열 id(`acc-1`)뿐이라 순번으로 수치 식별자를 만든다.
  accountId: index + 1,
  accountName: account.alias,
  accountNumber: account.accountNo,
  // 정본은 예금과 적금을 구분하지 않는다. 화면들이 보는 것은
  // DEMAND_DEPOSIT 여부뿐이라(B-05 출금계좌 자격) 예적금은 하나로 둔다.
  accountType: account.group === "checking" ? "DEMAND_DEPOSIT" : "TIME_DEPOSIT",
  status: "ACTIVE",
  balance: account.balance,
  openedDate: account.openedDate,
  // 정본은 한 필드(lastActivityDate)에 최근거래일과 만기일을 겸해 담고
  // isMaturityDate 로 구분한다. API 는 두 필드로 갈라져 있다.
  lastTransactionAt: account.isMaturityDate
    ? null
    : `${account.lastActivityDate}T09:12:40`,
  maturityDate: account.isMaturityDate ? account.lastActivityDate : null,
  withdrawalRegistered: account.isWithdrawalAccount,
  transferEnabled: account.group === "checking",
})

/**
 * 정본 픽스처 **전체 순번**으로 식별자를 매긴다. 그룹별로 매기면 입출금 1번과 예적금
 * 1번이 같은 accountId 를 갖게 돼, 계좌 ID 로 찾는 목이 엉뚱한 계좌를 잡는다.
 */
export const MOCK_ACCOUNT_ITEMS = MOCK_OVERVIEW_ACCOUNTS.map(
  (account, index) => ({ account, item: toAccountItem(account, index) }),
)

/**
 * 계좌 픽스처의 소유자. 정본의 첫 계좌번호를 가진 회원이다 — 이름을 여기 다시 적지
 * 않고 회원 픽스처(`MOCK_MEMBERS`)에서 찾는다.
 *
 * 서버는 계좌를 늘 고객 단위로 찾는다(`findByAccountIdAndCustomerId`). 목도 소유자가
 * 아니면 없는 계좌로 보고, 다른 회원이 이 계좌의 비밀번호를 검증하거나 출금계좌로
 * 쓰지 못하게 한다.
 */
export const MOCK_ACCOUNT_OWNER_ID = MOCK_MEMBERS.find(
  (member) => member.accountNo === MOCK_OVERVIEW_ACCOUNTS[0]?.accountNo,
)?.memberId

const isOwner = (memberId: string) => memberId === MOCK_ACCOUNT_OWNER_ID

export const findMockAccount = (accountId: number, memberId: string) =>
  isOwner(memberId)
    ? MOCK_ACCOUNT_ITEMS.find((entry) => entry.item.accountId === accountId)
    : undefined

const buildOverview = (memberId: string): AccountOverviewResponse => {
  const items: GroupResponse[] = GROUPS.map((group) => {
    const accounts = isOwner(memberId)
      ? MOCK_ACCOUNT_ITEMS.filter(
          (entry) => entry.account.group === group.id,
        ).map((entry) => entry.item)
      : []

    return {
      groupCode: group.code,
      groupName: group.name,
      // 합계는 적지 않고 더한다 — 계좌를 하나 넣고 합계를 못 고치는 일이 없게.
      groupTotalBalance: accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0),
      accounts,
    }
  })

  return {
    asOf: `${getToday()}T09:00:00`,
    totalAssets: items.reduce((sum, g) => sum + (g.groupTotalBalance ?? 0), 0),
    items,
  }
}

export const accountsApiHandlers = [
  // 실서버도 로그인 없이는 401 CMN0101 이다. 200 을 주면 세션이 끝난 뒤 다시
  // 조회해도 customFetch 의 만료 신호가 나가지 않는다.
  http.get("*/accounts", async () => {
    await delay(MOCK_LATENCY_MS)

    const memberId = readSignedInMemberId()
    if (memberId == null) return unauthorized()

    return ok(buildOverview(memberId))
  }),
]
