import { keepPreviousData } from "@tanstack/react-query"
import {
  useGetLedgerReconciliationMismatches,
  type LedgerReconciliationMismatchResponse,
  type PageResponseLedgerReconciliationMismatchResponse,
} from "@/shared/api/generated"

export type ReconciliationMismatch = {
  businessDate: string
  accountId: number
  /** 원장 누적 합계(입금 − 출금). 원장이 없는 계좌는 0. */
  ledgerBalance: number
  /** 대사 시점의 계좌 잔액. */
  accountBalance: number
  /** 원장 − 잔액. 양수면 잔액이 원장보다 적다. */
  difference: number
  detectedAt: string
}

export type ReconciliationMismatchPage = {
  /**
   * 이 목록이 어느 영업일의 대사 결과인가. **0건이면 `null` 이다** — 서버가 영업일을
   * 목록 각 건에만 싣고 페이지에는 싣지 않아, 비어 있으면 알 수 없다.
   */
  businessDate: string | null
  items: ReconciliationMismatch[]
  totalCount: number
  totalPages: number
}

const toMismatch = (
  item: LedgerReconciliationMismatchResponse,
): ReconciliationMismatch => ({
  businessDate: item.businessDate ?? "",
  accountId: item.accountId ?? 0,
  ledgerBalance: item.ledgerBalance ?? 0,
  accountBalance: item.accountBalance ?? 0,
  difference: item.difference ?? 0,
  detectedAt: item.detectedAt ?? "",
})

export const toMismatchPage = (
  response: PageResponseLedgerReconciliationMismatchResponse,
): ReconciliationMismatchPage => {
  const items = (response.items ?? []).map(toMismatch)
  return {
    businessDate: items[0]?.businessDate || null,
    items,
    totalCount: response.totalCount ?? 0,
    totalPages: response.totalPages ?? 0,
  }
}

/**
 * ADM-04 대사 불일치 목록(`GET /admin/ledger-reconciliation/mismatches`, PH-38).
 *
 * `businessDate` 가 `null` 이면 서버가 가장 최근에 불일치가 기록된 영업일을 고른다.
 * `page` 는 화면 기준 1부터다(서버는 0부터).
 */
export const useReconciliationMismatches = (params: {
  businessDate: string | null
  page: number
  size: number
}) => {
  const { data, isFetching, isError, error } =
    useGetLedgerReconciliationMismatches(
      {
        ...(params.businessDate ? { businessDate: params.businessDate } : {}),
        page: params.page - 1,
        size: params.size,
      },
      { query: { placeholderData: keepPreviousData } },
    )

  return {
    mismatchPage: data ? toMismatchPage(data) : undefined,
    isFetching,
    isError,
    error,
  }
}
