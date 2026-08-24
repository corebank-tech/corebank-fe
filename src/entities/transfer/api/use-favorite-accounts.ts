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

export type FavoriteAccount = FavoriteAccountResponse

export type RegisterFavoriteAccountVariables = {
  request: FavoriteAccountRegisterRequest
  idempotencyKey: string
}

/** D-01 자주 쓰는 계좌 목록(REQ-TRSF-006). */
export const useFavoriteAccountsQuery = () => useGetFavoriteAccounts()

export const getFavoriteAccountsQueryKey = () =>
  getGetFavoriteAccountsQueryKey()

/** D-01 자주 쓰는 계좌 등록(REQ-TRSF-006). 최대 20건(FAV0302). */
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
