import * as React from "react"
import { useMutation } from "@tanstack/react-query"
import {
  getGetFavoriteAccountsQueryKey,
  registerFavoriteAccount,
  useGetFavoriteAccounts,
} from "@/shared/api/generated"
import type {
  FavoriteAccountRegisterRequest,
  FavoriteAccountResponse,
} from "@/shared/api/generated"
import type { FrequentTransferAccount } from "@/entities/transfer/api/transfer"

export type FavoriteAccount = FavoriteAccountResponse

export type RegisterFavoriteAccountVariables = {
  request: FavoriteAccountRegisterRequest
  idempotencyKey: string
}

/**
 * D-01 자주 쓰는 계좌 목록(REQ-TRSF-026).
 *
 * 화면이 쓰는 형태(accounts)까지 여기서 만든다 — 응답 변환을 화면에 두면
 * 같은 매핑이 화면마다 복제된다.
 */
export const useFavoriteAccountsQuery = () => {
  const query = useGetFavoriteAccounts()

  const accounts = React.useMemo<FrequentTransferAccount[]>(
    () =>
      (query.data ?? []).map((favorite) => ({
        accountNo: favorite.depositAccountNumber ?? "",
        payeeName: favorite.payeeName ?? "",
        nickname: favorite.alias ?? undefined,
      })),
    [query.data],
  )

  return { ...query, accounts }
}

export const getFavoriteAccountsQueryKey = () =>
  getGetFavoriteAccountsQueryKey()

/** D-01 자주 쓰는 계좌 등록(REQ-TRSF-026). 최대 20건(FAV0302). */
export const useRegisterFavoriteAccountMutation = () =>
  useMutation({
    mutationFn: ({
      request,
      idempotencyKey,
    }: RegisterFavoriteAccountVariables) =>
      registerFavoriteAccount(request, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
  })
