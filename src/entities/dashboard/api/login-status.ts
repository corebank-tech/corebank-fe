import { useQuery } from "@tanstack/react-query"
import {
  getGetLoginStatusQueryKey,
  getLoginStatus,
  type LoginStatusResponse,
} from "@/shared/api/generated"

export const getLoginStatusQueryKey = () => getGetLoginStatusQueryKey()

/** A-09 최종접속정보(REQ-AUTH-030). previousLoginAt·lastTransactionAt 은 이력이 없으면 null 이다. */
export const useLoginStatusQuery = () =>
  useQuery({
    queryKey: getLoginStatusQueryKey(),
    queryFn: ({ signal }) => getLoginStatus({ signal }),
  })

export type { LoginStatusResponse }
