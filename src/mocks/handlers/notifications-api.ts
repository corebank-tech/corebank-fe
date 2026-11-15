import { delay, http } from "msw"
import type {
  NotificationInboxItemResponse,
  NotificationListResponse,
} from "@/shared/api/generated"
import { readSignedInMemberId, unauthorized } from "@/mocks/handlers/auth"
import { fail, ok } from "@/mocks/lib/envelope"
import { readStore, writeStore } from "@/mocks/lib/mock-store"

const MOCK_LATENCY_MS = 200
const READ_IDS_STORE_KEY = "notifications:read-ids"
const DEFAULT_PAGE_SIZE = 10
const FAILURE_SCENE_STORE_KEY = "notifications:failure-scene"

/** e2e 가 sessionStorage 로 고르는 실패 장면. 서버 오류 문구가 화면에 그대로 뜨는지 본다. */
type NotificationFailureScene = "list" | "read"

const readFailureScene = () =>
  readStore<NotificationFailureScene | null>(FAILURE_SCENE_STORE_KEY, null)

/**
 * 알림함(F-02)·헤더 배지(A-90)·대시보드 미읽음 요약(A-09) MSW 목.
 *
 * 12건 중 앞의 4건이 미읽음이다. 기본 페이지 크기(10)로 두 페이지가 되어 e2e 가
 * 페이징을 밟는다. 읽음 처리는 sessionStorage 에 남아 새로고침해도 유지된다.
 */
const MOCK_NOTIFICATIONS = [
  [
    "이체",
    "이체가 정상 처리되었습니다.",
    "자유입출금에서 김*수님께 500,000원을 이체했습니다.",
    "2026-11-10T08:41:05+09:00",
  ],
  [
    "예약이체",
    "예약이체 1건이 정상 처리되었습니다.",
    "2026.11.09 자유입출금 → 김*수 500,000원",
    "2026-11-09T00:10:12+09:00",
  ],
  [
    "자동이체",
    "자동이체 출금계좌 잔액이 부족합니다.",
    "급여통장 → 박*훈 187,400원 회차가 오류 처리되었습니다.",
    "2026-11-08T00:10:07+09:00",
  ],
  [
    "상품가입",
    "정기적금 가입이 완료되었습니다.",
    "내집마련적금 계좌가 개설되었습니다.",
    "2026-11-07T11:20:00+09:00",
  ],
  [
    "예약이체",
    "예약이체 1건이 오류 처리되었습니다.",
    "2026.11.06 비상금통장 → 최*진 1,000,000원, 잔액 부족",
    "2026-11-06T00:10:09+09:00",
  ],
  [
    "자동이체",
    "자동이체가 정상 처리되었습니다.",
    "자유입출금 → 홍*동 500,000원",
    "2026-11-05T00:10:03+09:00",
  ],
  [
    "이체",
    "이체가 정상 처리되었습니다.",
    "자유입출금에서 이*연님께 120,000원을 이체했습니다.",
    "2026-11-04T19:12:50+09:00",
  ],
  [
    "이체",
    "이체가 오류 처리되었습니다.",
    "급여통장에서 박*훈님께 이체가 잔액 부족으로 처리되지 못했습니다.",
    "2026-11-03T13:05:36+09:00",
  ],
  [
    "예약이체",
    "예약이체가 취소되었습니다.",
    "2026.11.02 자유입출금 → 이*연 200,000원 예약이 취소되었습니다.",
    "2026-11-02T09:02:00+09:00",
  ],
  [
    "상품가입",
    "정기예금 가입이 완료되었습니다.",
    "정기예금 1년 계좌가 개설되었습니다.",
    "2026-11-01T10:05:00+09:00",
  ],
  [
    "이체",
    "이체가 정상 처리되었습니다.",
    "자유입출금에서 최*진님께 30,000원을 이체했습니다.",
    "2026-10-31T15:30:00+09:00",
  ],
  [
    "자동이체",
    "자동이체가 정상 처리되었습니다.",
    "자유입출금 → 홍*동 500,000원",
    "2026-10-30T00:10:03+09:00",
  ],
].map(([typeName, title, content, occurredAt], index) => ({
  notificationId: 12 - index,
  typeName,
  title,
  content,
  occurredAt,
}))

const INITIALLY_UNREAD_COUNT = 4

const readIds = (): number[] =>
  readStore<number[] | null>(READ_IDS_STORE_KEY, null) ??
  MOCK_NOTIFICATIONS.slice(INITIALLY_UNREAD_COUNT).map(
    (notification) => notification.notificationId,
  )

const withReadState = (): NotificationInboxItemResponse[] => {
  const readIdSet = new Set(readIds())
  return MOCK_NOTIFICATIONS.map((notification) => {
    const isRead = readIdSet.has(notification.notificationId)
    return {
      ...notification,
      read: isRead,
      readAt: isRead ? notification.occurredAt : null,
    }
  })
}

const countUnread = (): number =>
  withReadState().filter((notification) => !notification.read).length

export const notificationsApiHandlers = [
  http.get("*/notifications/unread-count", async () => {
    await delay(MOCK_LATENCY_MS)
    if (readSignedInMemberId() == null) return unauthorized()
    return ok({ unreadCount: countUnread() })
  }),

  http.get("*/notifications", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)
    if (readSignedInMemberId() == null) return unauthorized()
    if (readFailureScene() === "list") {
      return fail("CMN9999", "일시적인 오류가 발생했습니다.", 500)
    }

    const searchParams = new URL(request.url).searchParams
    const isAll = searchParams.get("all") === "true"
    const page = Number(searchParams.get("page") ?? 0)
    const size = Number(searchParams.get("size") ?? DEFAULT_PAGE_SIZE)
    const notifications = withReadState()
    const items = isAll
      ? notifications
      : notifications.slice(page * size, (page + 1) * size)

    return ok({
      asOf: new Date().toISOString(),
      unreadCount: countUnread(),
      page: isAll ? 0 : page,
      size: isAll ? notifications.length : size,
      totalCount: notifications.length,
      totalPages: isAll ? 1 : Math.ceil(notifications.length / size),
      items,
    } satisfies NotificationListResponse)
  }),

  http.patch("*/notifications/:notificationId/read", async ({ params }) => {
    await delay(MOCK_LATENCY_MS)
    if (readSignedInMemberId() == null) return unauthorized()

    if (readFailureScene() === "read") {
      return fail("NTF0201", "알림을 찾을 수 없습니다.", 404)
    }

    const notificationId = Number(params.notificationId)
    const notification = MOCK_NOTIFICATIONS.find(
      (candidate) => candidate.notificationId === notificationId,
    )
    if (!notification) {
      return fail("NTF0201", "알림을 찾을 수 없습니다.", 404)
    }

    writeStore(READ_IDS_STORE_KEY, [...new Set([...readIds(), notificationId])])
    return ok({
      notificationId,
      read: true,
      readAt: new Date().toISOString(),
      unreadCount: countUnread(),
    })
  }),
]
