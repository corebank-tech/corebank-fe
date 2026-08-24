import { keepPreviousData } from "@tanstack/react-query"
import {
  useGetTransferDetail,
  useSearchTransfers,
} from "@/shared/api/generated"
import type { SearchTransfersParams } from "@/shared/api/generated"

const KEEP_PREVIOUS_RESULT = { placeholderData: keepPreviousData } as const

/** 이체결과조회(D-04) 목록. 서버가 출금계좌 단위 조회만 지원한다(withdrawalAccountId 필수). */
export const useTransferHistory = (
  params: SearchTransfersParams,
  options?: { enabled?: boolean },
) => {
  const { data, isFetching, isError, error, refetch } = useSearchTransfers(
    params,
    {
      query: { ...KEEP_PREVIOUS_RESULT, enabled: options?.enabled },
    },
  )

  return {
    page: data,
    // REQ-INQR-014: 서버가 조회 기준 시각을 내려준다. 브라우저 수신 시각을 쓰면
    // 같은 화면의 집계·총건수와 다른 시점을 가리킨다.
    asOf: data?.asOf,
    isFetching,
    isError,
    error,
    refetch,
  }
}

/**
 * 이체 상세(REQ-TRSF-023). 목록의 거래번호를 눌러 모달을 열 때만 조회한다 —
 * 목록 응답에는 수수료·표시내용이 없다.
 */
export const useTransferDetail = (transactionNumber: string | null) => {
  const { data, isFetching, isError, error } = useGetTransferDetail(
    transactionNumber ?? "",
    { query: { enabled: transactionNumber != null } },
  )

  return { detail: data, isFetching, isError, error }
}
