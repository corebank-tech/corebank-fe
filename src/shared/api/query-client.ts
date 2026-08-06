import { QueryClient } from "@tanstack/react-query"
import { isApiError } from "@/shared/api/api-error"

/** 잔액·거래내역은 캐시에서 조용히 재사용하지 않는다. 마운트마다 재조회한다. */
const QUERY_STALE_TIME_MS = 0
/** 뒤로가기 직후 깜빡임만 막는 짧은 보관. 오래된 금액이 다시 보이는 창을 좁힌다. */
const QUERY_GC_TIME_MS = 30_000
const QUERY_MAX_RETRY_COUNT = 1
const QUERY_RETRY_DELAY_MS = 500
const SERVER_ERROR_STATUS_MIN = 500

const shouldRetryQuery = (failureCount: number, error: Error): boolean => {
  if (failureCount >= QUERY_MAX_RETRY_COUNT) return false
  if (!isApiError(error)) return false
  // 4xx(검증·권한·세션)는 재시도해도 결과가 같다. 전송 실패와 5xx만 한 번 재시도한다.
  return error.status === 0 || error.status >= SERVER_ERROR_STATUS_MIN
}

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        gcTime: QUERY_GC_TIME_MS,
        retry: shouldRetryQuery,
        retryDelay: QUERY_RETRY_DELAY_MS,
        // POL-001: 백그라운드 재조회는 사용자 조작 없이 서버 세션을 갱신해
        // 10분 자동 로그아웃을 무력화한다. 그래서 전부 끈다.
        refetchOnWindowFocus: false,
        refetchInterval: false,
        refetchOnReconnect: true,
      },
      mutations: {
        // REQ-CMN-014: 자동 재시도는 멱등키 재사용을 보장할 수 없다. 재시도는 사용자 행위로만.
        retry: 0,
      },
    },
  })
