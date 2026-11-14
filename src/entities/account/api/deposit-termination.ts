import { useMutation, type QueryClient } from "@tanstack/react-query"
import {
  earlyTerminateAccount,
  terminateMaturedAccount,
  usePreviewEarlyTermination,
  usePreviewMaturityTermination,
  type EarlyTerminationResponse,
  type MaturityTerminationResponse,
  type TerminationPreviewResponse,
} from "@/shared/api/generated"
import { useAccountOverviewQuery } from "@/entities/account/api/account-overview-query"
import type { DepositTerminationKind } from "@/entities/account/lib/deposit-termination"

export type DepositTerminationResult =
  MaturityTerminationResponse | EarlyTerminationResponse

/** 해지 예상 조회 응답에서 화면이 금액 계산 없이 그대로 보여 줄 값. */
export type DepositTerminationPreview = {
  withdrawalAccountId: number
  principal: number
  grossInterest: number
  tax: number
  netInterest: number
  totalExpectedAmount: number
  calculatedAt: string
}

/** 필수 값이 하나라도 비면 금액을 임의로 채우지 않고 null 을 준다. */
export const toDepositTerminationPreview = (
  response: TerminationPreviewResponse | undefined,
): DepositTerminationPreview | null => {
  if (
    response?.withdrawalAccountId == null ||
    response.principal == null ||
    response.grossInterest == null ||
    response.tax == null ||
    response.netInterest == null ||
    response.totalExpectedAmount == null ||
    response.calculatedAt == null
  ) {
    return null
  }

  return {
    withdrawalAccountId: response.withdrawalAccountId,
    principal: response.principal,
    grossInterest: response.grossInterest,
    tax: response.tax,
    netInterest: response.netInterest,
    totalExpectedAmount: response.totalExpectedAmount,
    calculatedAt: response.calculatedAt,
  }
}

export const useDepositTerminationPreviewQuery = (
  accountId: number,
  kind: DepositTerminationKind,
) => {
  const maturityPreview = usePreviewMaturityTermination(accountId, {
    query: { enabled: kind === "maturity", gcTime: 0 },
  })
  const earlyPreview = usePreviewEarlyTermination(accountId, {
    query: { enabled: kind === "early", gcTime: 0 },
  })

  return kind === "maturity" ? maturityPreview : earlyPreview
}

type TerminateDepositVariables = {
  kind: DepositTerminationKind
  accountId: number
  accountPasswordAuthToken: string
  idempotencyKey: string
}

/**
 * 해지 실행. 멱등키는 화면이 거래 단위로 잡아 넘긴다 — 시간 초과 뒤 재시도에서
 * 키가 바뀌면 서버가 이중 해지로 처리한다(REQ-CMN-014).
 */
export const terminateDeposit = ({
  kind,
  accountId,
  accountPasswordAuthToken,
  idempotencyKey,
}: TerminateDepositVariables): Promise<DepositTerminationResult> => {
  const options = {
    headers: {
      "Idempotency-Key": idempotencyKey,
      "Account-Password-Auth-Token": accountPasswordAuthToken,
    },
  }

  return kind === "maturity"
    ? terminateMaturedAccount(accountId, options)
    : earlyTerminateAccount(accountId, options)
}

export const useTerminateDepositMutation = () =>
  useMutation({ mutationFn: terminateDeposit })

/** 계좌 개요·상세·거래내역 조회 키는 모두 `/accounts` 경로로 시작한다. */
const isAccountQueryKey = (key: unknown) =>
  key === "/accounts" || String(key).startsWith("/accounts/")

export const invalidateAccountQueries = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    predicate: (query) => isAccountQueryKey(query.queryKey[0]),
  })

/** 전체계좌 개요에서 계좌 ID 로 계좌 하나를 찾는다. */
export const useOverviewAccount = (accountId: number | null | undefined) => {
  const { data: overview, isLoading, isError } = useAccountOverviewQuery()

  const accounts = overview?.items?.flatMap((group) => group.accounts ?? [])
  const account = accounts?.find((item) => item.accountId === accountId)

  return { account, isLoading, isError }
}
