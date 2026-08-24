import { keepPreviousData } from "@tanstack/react-query"
import { useQueryBaseTime } from "@/shared/lib/hooks/use-base-time"
import {
  useSearchAutoTransferExecutions,
  useSearchScheduledTransferExecutions,
} from "@/shared/api/generated"
import type {
  SearchAutoTransferExecutionsParams,
  SearchScheduledTransferExecutionsParams,
} from "@/shared/api/generated"

/**
 * 기준일시는 지금 화면에 떠 있는 데이터를 받은 시각이다(#44). 마운트 시각을 쓰면
 * 조회조건을 만지는 동안 라벨만 앞서 나가 실제 결과 시점과 어긋난다. 두 화면이
 * 같은 계산을 하므로 훅이 값까지 만들어 돌려준다.
 *
 * 조회조건·페이지를 바꾸면 새 쿼리 키라 data가 undefined로 떨어진다. 결과가 올
 * 때까지 이전 응답을 유지해서 조회조건 폼과 집계가 화면째로 사라지지 않게 한다.
 * 두 실행이력 화면(G-05·E-05)이 같은 이유로 같은 설정을 쓴다.
 */
const KEEP_PREVIOUS = { placeholderData: keepPreviousData } as const

/** 자동이체 실행이력(G-05). */
export const useAutoTransferExecutions = (
  params: SearchAutoTransferExecutionsParams,
  options?: { enabled?: boolean },
) => {
  const {
    data,
    dataUpdatedAt,
    isPlaceholderData,
    isFetching,
    isError,
    error,
    refetch,
  } = useSearchAutoTransferExecutions(params, {
    query: { ...KEEP_PREVIOUS, enabled: options?.enabled },
  })

  return {
    page: data,
    baseTime: useQueryBaseTime({ dataUpdatedAt, isPlaceholderData }),
    isFetching,
    isError,
    error,
    refetch,
  }
}

/** 예약이체 처리결과(E-05). */
export const useScheduledTransferExecutions = (
  params: SearchScheduledTransferExecutionsParams,
) => {
  const {
    data,
    dataUpdatedAt,
    isPlaceholderData,
    isFetching,
    isError,
    error,
    refetch,
  } = useSearchScheduledTransferExecutions(params, { query: KEEP_PREVIOUS })

  return {
    page: data,
    baseTime: useQueryBaseTime({ dataUpdatedAt, isPlaceholderData }),
    isFetching,
    isError,
    error,
    refetch,
  }
}
