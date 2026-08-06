/**
 * F-02 알림함 목업 데이터. REQ-MYPG-004·005.
 * 이체·예약이체·자동이체·상품가입 결과 알림만 다룬다.
 */

export type NotificationCategory = "이체" | "예약이체" | "자동이체" | "상품가입"

export type NotificationInboxRow = {
  id: string
  category: NotificationCategory
  title: string
  content: string
  /** 발생일시 ISO datetime. */
  occurredAt: string
  read: boolean
}

export const MOCK_NOTIFICATION_INBOX: NotificationInboxRow[] = [
  {
    id: "in10",
    category: "이체",
    title: "이체가 정상 처리되었습니다.",
    content: "자유입출금에서 김*수님께 500,000원을 이체했습니다.",
    occurredAt: "2026-07-23T08:41:05",
    read: false,
  },
  {
    id: "in09",
    category: "예약이체",
    title: "예약이체 1건이 정상 처리되었습니다.",
    content: "2026.07.15 자유입출금 → 김*수 500,000원",
    occurredAt: "2026-07-15T00:10:12",
    read: false,
  },
  {
    id: "in08",
    category: "자동이체",
    title: "자동이체 출금계좌 잔액이 부족합니다.",
    content: "급여통장 → 박*훈 187,400원 회차가 오류 처리되었습니다.",
    occurredAt: "2026-06-21T00:10:07",
    read: false,
  },
  {
    id: "in07",
    category: "상품가입",
    title: "정기적금 가입이 완료되었습니다.",
    content: "내집마련적금 계좌가 개설되었습니다. 자동이체 등록을 진행하세요.",
    occurredAt: "2026-06-05T11:20:00",
    read: true,
  },
  {
    id: "in06",
    category: "예약이체",
    title: "예약이체 1건이 오류 처리되었습니다.",
    content: "2026.07.12 비상금통장 → 최*진 1,000,000원, 잔액 부족",
    occurredAt: "2026-07-12T00:10:09",
    read: true,
  },
  {
    id: "in05",
    category: "자동이체",
    title: "자동이체가 정상 처리되었습니다.",
    content: "자유입출금 → 홍*동 500,000원 (내집마련적금)",
    occurredAt: "2026-07-05T00:10:03",
    read: true,
  },
  {
    id: "in04",
    category: "이체",
    title: "이체가 정상 처리되었습니다.",
    content: "자유입출금에서 이*연님께 120,000원을 이체했습니다.",
    occurredAt: "2026-07-22T19:12:50",
    read: true,
  },
  {
    id: "in03",
    category: "이체",
    title: "이체가 오류 처리되었습니다.",
    content: "급여통장에서 박*훈님께 이체가 잔액 부족으로 처리되지 못했습니다.",
    occurredAt: "2026-07-21T13:05:36",
    read: true,
  },
  {
    id: "in02",
    category: "예약이체",
    title: "예약이체가 취소되었습니다.",
    content: "2026.07.10 자유입출금 → 이*연 200,000원 예약이 취소되었습니다.",
    occurredAt: "2026-07-10T09:02:00",
    read: true,
  },
  {
    id: "in01",
    category: "상품가입",
    title: "정기예금 가입이 완료되었습니다.",
    content: "정기예금 1년 계좌가 개설되었습니다.",
    occurredAt: "2026-06-01T10:05:00",
    read: true,
  },
]
