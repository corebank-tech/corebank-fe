import * as React from "react"
import { useGetAccounts } from "@/shared/api/generated/account-controller/account-controller"
import type {
  AccountItemResponse,
  AccountOverviewResponse,
} from "@/shared/api/generated/model"

/**
 * 출금계좌로 쓸 수 있는 보유 계좌 목록.
 *
 * "출금계좌 자격"의 정의를 여기 한 곳에 둔다 — 자동이체 등록(G-01)·예약이체 등록(E-01)·
 * 자동이체 조회(G-04)가 같은 조건을 각자 복제하고 있었다. 조건이 바뀌면 이 파일만 고친다.
 */
export const useWithdrawAccounts = (): {
  accounts: AccountItemResponse[]
  isLoading: boolean
} => {
  const { data, isLoading } = useGetAccounts()

  // orval이 생성한 타입은 스펙에 적힌 공통 응답 봉투(ApiResponse<T>) 그대로다.
  // customFetch가 런타임에는 이미 봉투를 벗겨 data만 돌려주므로, 실제 형태로 다시 맞춰준다.
  const overview = data as unknown as AccountOverviewResponse | undefined

  const accounts = React.useMemo(() => {
    const items = (overview?.items ?? []).flatMap((g) => g.accounts ?? [])
    // 출금계좌로 쓸 수 있는 건 입출금계좌 중 이체 가능한 활성 계좌뿐이다.
    return items.filter(
      (a) =>
        a.accountType === "DEMAND_DEPOSIT" &&
        a.status === "ACTIVE" &&
        a.transferEnabled,
    )
  }, [overview])

  return { accounts, isLoading }
}
