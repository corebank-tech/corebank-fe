import { keepPreviousData, useQueryClient } from "@tanstack/react-query"
import {
  getGetAdminCustomerDetailQueryKey,
  getSearchAdminCustomersQueryKey,
  useChangeAdminCustomerStatus,
  useGetAdminCustomerDetail,
  useResetAdminCustomerPassword,
  useSearchAdminCustomers,
  useUnlockAdminCustomer,
  type AdminCustomerDetailResponse,
  type AdminCustomerSummaryResponse,
} from "@/shared/api/generated"
import {
  ACCESS_REASON_HEADER,
  type AccessReason,
} from "@/entities/admin-customer/lib/access-reason"
import {
  toSearchParams,
  type AdminCustomerSearchCondition,
} from "@/entities/admin-customer/lib/search-condition"

/**
 * ADM-01 관리자 고객 계정 운영 API(PH-97).
 *
 * **개인정보는 서버가 마스킹해 보낸다**(`AdminCustomerQueryService`). 화면은 받은 값을
 * 그대로 그리고 다시 마스킹하지 않는다 — 이미 가려진 값을 FE 규칙으로 또 가리면
 * 서버 규칙과 다른 모양이 된다.
 *
 * 조회 사유(`X-Access-Reason`, PH-89, REQ-ADM-019)는 이 파일의 훅만 붙인다. 화면이
 * 생성 훅을 직접 부르지 않게 해서 헤더를 빠뜨릴 경로를 없앤다. 사유가 `null` 이면
 * 조회는 요청하지 않는다 — "사유를 고르지 않으면 요청이 나가지 않는다".
 *
 * 쿼리 키에 사유를 넣는다. 같은 조건에서 사유만 바꿔도 다시 요청해야 서버 감사의
 * Why 에 바뀐 사유가 남는다.
 */

const reasonRequest = (reason: AccessReason | null) =>
  reason ? { headers: { [ACCESS_REASON_HEADER]: reason } } : undefined

export type AdminCustomerStatus = "ACTIVE" | "SUSPENDED"

/** 목록과 상세가 같이 쓰는 화면 모델. 목록 응답에 없는 칸은 `null` 이다. */
export type AdminCustomer = {
  customerId: number
  /** 앞 4자리 외 마스킹 */
  userId: string
  /** 마스킹 */
  userName: string
  /** 마스킹(`1995-**-**`). 목록 응답에는 없다 */
  birthDate: string | null
  /** 마스킹 */
  email: string
  /** 마스킹(`010****5678`). 목록 응답에는 없다 */
  phoneNumber: string | null
  loginFailureCount: number
  accountLocked: boolean
  status: AdminCustomerStatus
  /** 한 번도 로그인하지 않았으면 `null` */
  lastLoginAt: string | null
  joinedAt: string
}

export type AdminCustomerPage = {
  customers: AdminCustomer[]
  totalCount: number
  totalPages: number
}

/**
 * 생성 타입은 전 필드가 선택이라 화면이 매번 `??` 를 달게 되므로 여기서 한 번 채운다.
 * `status` 가 빠지면 정상으로 추측하지 않고 정지로 둔다 — 정지 계정을 정상으로
 * 그리면 관리자가 막힌 계정을 놓친다.
 */
const toAdminCustomer = (
  response: AdminCustomerSummaryResponse & AdminCustomerDetailResponse,
): AdminCustomer => ({
  customerId: response.customerId ?? 0,
  userId: response.userId ?? "",
  userName: response.userName ?? "",
  birthDate: response.birthDate ?? null,
  email: response.email ?? "",
  phoneNumber: response.phoneNumber ?? null,
  loginFailureCount: response.loginFailureCount ?? 0,
  accountLocked: response.accountLocked ?? false,
  status: response.status === "ACTIVE" ? "ACTIVE" : "SUSPENDED",
  lastLoginAt: response.lastLoginAt ?? null,
  joinedAt: response.joinedAt ?? "",
})

/**
 * 고객 검색(`GET /admin/customers`). 권한 `CUSTOMER_READ`.
 *
 * `condition` 이 `null` 이면 요청하지 않는다. 서버는 조건 없는 검색을 거부하므로
 * (`검색 조건을 하나 이상 입력해 주세요.`) 첫 화면에서 자동 조회하면 오류부터 보인다.
 * 조건 검증 문구는 서버가 단일 출처다 — 화면이 같은 규칙을 다시 만들지 않는다.
 *
 * `page` 는 화면 기준 1부터다(서버는 0부터).
 */
export const useAdminCustomerSearch = (params: {
  condition: AdminCustomerSearchCondition | null
  reason: AccessReason | null
  page: number
  size: number
}) => {
  const searchParams = params.condition
    ? {
        ...toSearchParams(params.condition),
        page: params.page - 1,
        size: params.size,
      }
    : {}
  const { data, isFetching, isError, error } = useSearchAdminCustomers(
    searchParams,
    {
      query: {
        queryKey: [
          ...getSearchAdminCustomersQueryKey(searchParams),
          params.reason,
        ],
        enabled: params.condition != null && params.reason != null,
        placeholderData: keepPreviousData,
      },
      request: reasonRequest(params.reason),
    },
  )

  return {
    customerPage: data
      ? ({
          customers: (data.items ?? []).map(toAdminCustomer),
          totalCount: data.totalCount ?? 0,
          totalPages: data.totalPages ?? 0,
        } satisfies AdminCustomerPage)
      : undefined,
    isFetching,
    isError,
    error,
  }
}

/** 고객 상세(`GET /admin/customers/{customerId}`). 권한 `CUSTOMER_READ`. */
export const useAdminCustomerDetail = (
  customerId: number,
  reason: AccessReason | null,
) => {
  const { data, isPending, isError, error } = useGetAdminCustomerDetail(
    customerId,
    {
      query: {
        queryKey: [...getGetAdminCustomerDetailQueryKey(customerId), reason],
        enabled:
          Number.isInteger(customerId) && customerId > 0 && reason != null,
      },
      request: reasonRequest(reason),
    },
  )

  return {
    customer: data ? toAdminCustomer(data) : undefined,
    isPending,
    isError,
    error,
  }
}

/**
 * 변경 뒤 이 고객의 상세와 모든 검색 결과를 다시 받게 한다. 목록으로 돌아갔을 때
 * 배지가 변경 전 값으로 남지 않게 하려는 것이다.
 */
const useInvalidateCustomer = () => {
  const queryClient = useQueryClient()
  return (customerId: number) =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: getGetAdminCustomerDetailQueryKey(customerId),
      }),
      queryClient.invalidateQueries({
        queryKey: getSearchAdminCustomersQueryKey(),
      }),
    ])
}

/**
 * 계정 운영 3종. 권한 `CUSTOMER_WRITE`.
 *
 * `Idempotency-Key` 는 `customFetch` 가 요청마다 새로 붙인다. 잠금 해제와 상태 변경은
 * 서버가 "이미 같은 상태여도 200"이라 다시 눌러도 결과가 같다.
 *
 * 사유는 상세를 연 사유를 그대로 쓴다. 화면은 사유 없이 상세를 그리지 않으므로
 * 변경 버튼이 보일 때는 항상 사유가 있다.
 */
export const useAdminCustomerOperations = (reason: AccessReason | null) => {
  const invalidate = useInvalidateCustomer()
  const onSuccess = (_: unknown, variables: { customerId: number }) =>
    invalidate(variables.customerId)
  const request = reasonRequest(reason)

  const unlock = useUnlockAdminCustomer({ mutation: { onSuccess }, request })
  const changeStatus = useChangeAdminCustomerStatus({
    mutation: { onSuccess },
    request,
  })
  const resetPassword = useResetAdminCustomerPassword({
    mutation: { onSuccess },
    request,
  })

  return { unlock, changeStatus, resetPassword }
}
