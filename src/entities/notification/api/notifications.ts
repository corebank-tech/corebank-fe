import { keepPreviousData, useQueryClient } from "@tanstack/react-query"
import {
  getGetNotificationsQueryKey,
  getGetUnreadNotificationCountQueryKey,
  useGetNotifications,
  useGetUnreadNotificationCount,
  useMarkNotificationAsRead,
} from "@/shared/api/generated"
import type {
  GetNotificationsParams,
  NotificationInboxItemResponse,
  NotificationUnreadCountResponse,
} from "@/shared/api/generated"

/** F-02 알림함 한 행. REQ-MYPG-004 — 발생일시·구분·제목·내용. */
export type NotificationInboxRow = {
  notificationId: number
  /** 알림 유형 표시명. 서버가 정한 이름을 그대로 쓴다. */
  typeName: string
  title: string
  content: string
  occurredAt: string
  isRead: boolean
}

type NotificationInboxPage = {
  notifications: NotificationInboxRow[]
  totalCount: number
  totalPages: number
}

/** page 는 화면 기준 1부터 센다. */
type NotificationInboxPageRequest = {
  page: number
  size: number | "all"
}

const toNotificationInboxRow = (
  item: NotificationInboxItemResponse,
): NotificationInboxRow => ({
  notificationId: item.notificationId ?? 0,
  typeName: item.typeName ?? "",
  title: item.title ?? "",
  content: item.content ?? "",
  occurredAt: item.occurredAt ?? "",
  isRead: item.read === true,
})

const toNotificationsParams = ({
  page,
  size,
}: NotificationInboxPageRequest): GetNotificationsParams =>
  size === "all" ? { all: true } : { page: page - 1, size }

/** 알림 목록(`GET /notifications`). REQ-MYPG-004 — 발생일시 최신순. */
export const useNotificationInboxQuery = (
  request: NotificationInboxPageRequest,
) => {
  const { data, isPending, isPlaceholderData, isError, error } =
    useGetNotifications(toNotificationsParams(request), {
      query: { placeholderData: keepPreviousData },
    })

  return {
    inboxPage: data
      ? ({
          notifications: (data.items ?? []).map(toNotificationInboxRow),
          totalCount: data.totalCount ?? 0,
          totalPages: data.totalPages ?? 0,
        } satisfies NotificationInboxPage)
      : undefined,
    isLoading: isPending || isPlaceholderData,
    isError,
    error,
  }
}

/** 헤더 배지에 쓰는 전체 미읽음 건수(`GET /notifications/unread-count`). */
export const useUnreadNotificationCountQuery = ({
  enabled,
}: {
  enabled: boolean
}) => {
  const { data } = useGetUnreadNotificationCount({ query: { enabled } })

  return { unreadCount: data?.unreadCount }
}

/**
 * 알림 읽음 처리(`PATCH /notifications/{id}/read`). REQ-MYPG-005 — 읽음 처리 후
 * 헤더 미읽음 배지에 즉시 반영한다. 서버가 처리 후 남은 미읽음 건수를 돌려준다.
 */
export const useMarkNotificationReadMutation = () => {
  const queryClient = useQueryClient()

  return useMarkNotificationAsRead({
    mutation: {
      onSuccess: (readResult) => {
        queryClient.setQueryData<NotificationUnreadCountResponse>(
          getGetUnreadNotificationCountQueryKey(),
          { unreadCount: readResult.unreadCount },
        )
        return queryClient.invalidateQueries({
          queryKey: getGetNotificationsQueryKey(),
        })
      },
    },
  })
}
