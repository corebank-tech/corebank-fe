import { daysAgo } from "@/shared/lib/mock-date"

/** Dashboard presentation data. KRW single currency, Asia/Seoul. */

export type NotificationCategory = "이체" | "출금" | "안내"

export type NotificationItem = {
  id: string
  category: NotificationCategory
  title: string
  /** ISO datetime. */
  datetime: string
}

/** 미읽음 알림 3건. */
export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    category: "이체",
    title: "예약이체 1건이 정상 처리되었습니다.",
    datetime: `${daysAgo(0)}T09:12:40`,
  },
  {
    id: "n2",
    category: "출금",
    title: "카드대금 642,000원이 출금되었습니다.",
    datetime: `${daysAgo(1)}T19:12:47`,
  },
  {
    id: "n3",
    category: "안내",
    title: "이체한도 상향 신청 결과가 도착했습니다.",
    datetime: `${daysAgo(1)}T14:03:15`,
  },
]
