import { getGetAccountsQueryKey, useGetAccounts } from "@/shared/api/generated"

/** 전체계좌 개요(B-01). 생성 훅을 화면이 직접 참조하지 않도록 여기서 한 번 감싼다. */
export const useAccountOverviewQuery = () => useGetAccounts()

export const getAccountOverviewQueryKey = () => getGetAccountsQueryKey()
