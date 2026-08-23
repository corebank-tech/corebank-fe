import { daysAgo, daysAhead } from "@/shared/lib/mock-date"

/**
 * E-04 예약이체 조회/취소. REQ-RSV-007·008.
 * 상태는 대기/완료/실패/취소 4종(POL-025 이체 처리상태와 별개 체계)이다.
 */

export type ReservationStatus = "대기" | "완료" | "실패" | "취소"

export type ReservationRow = {
  id: string
  status: ReservationStatus
  /** 이체 예정일자 ISO date. */
  scheduledDate: string
  /** 등록일시 ISO datetime. 서버 응답에 아직 없어 BE 반영 전까지는 비어있다. */
  registeredAt?: string
  /** 서버가 마스킹해서 내려준다(예: `110******877`). 화면에서 다시 가공하지 않는다. */
  fromAccountNo: string
  /** 계좌 별칭. 서버 응답에 아직 없어 BE 반영 전까지는 비어있다. */
  fromAlias?: string
  /** 서버가 마스킹해서 내려준다. */
  toAccountNo: string
  /** 서버가 마스킹해서 내려준다(예: `홍*동`). */
  payeeName: string
  amount: number
  /** 표시내용. 서버 응답에 아직 없어 BE 반영 전까지는 비어있다. */
  memo?: string
  /** 취소 가능 여부. 서버가 REQ-RSV-008 규칙(예정일 전일까지)을 적용해 계산해 준다. */
  cancelable: boolean
}

/**
 * **B-05 출금계좌 삭제 차단(REQ-ACCT-011)의 입력**이다. E-04는 서버 응답을 매핑해서 쓰므로
 * 화면도 스토리도 이 배열을 읽지 않는다 — 계좌번호와 상태 조합을 바꾸면 B-05에서 안내되는
 * 차단 사유만 달라진다.
 *
 * 날짜는 오늘 기준 상대값이다.
 */
export const MOCK_RESERVATIONS: ReservationRow[] = [
  {
    id: "rsv7",
    status: "대기",
    scheduledDate: daysAhead(3),
    registeredAt: `${daysAgo(1)}T10:12:00`,
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "333330730135",
    payeeName: "김민수",
    amount: 300_000,
    memo: "생활비",
    cancelable: true,
  },
  {
    // 출금계좌가 자유입출금인 것은 의도다. 급여통장(302998112233)에 대기 예약이체를
    // 두면 B-05 삭제 차단이 그 계좌에서도 예약이체 사유로 먼저 걸려, 정상 자동이체
    // 사유(REQ-ACCT-011)가 화면에 한 번도 표시되지 않는다.
    id: "rsv6",
    status: "대기",
    scheduledDate: daysAhead(4),
    registeredAt: `${daysAgo(2)}T09:30:00`,
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "110550098213",
    payeeName: "박지훈",
    amount: 2_000_000,
    memo: "월세",
    cancelable: true,
  },
  {
    id: "rsv5",
    status: "대기",
    scheduledDate: daysAhead(11),
    registeredAt: `${daysAgo(3)}T14:05:00`,
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "444401122938",
    payeeName: "이서연",
    amount: 150_000,
    memo: "-",
    cancelable: true,
  },
  {
    id: "rsv4",
    status: "완료",
    scheduledDate: daysAgo(6),
    registeredAt: `${daysAgo(11)}T11:00:00`,
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "333330730135",
    payeeName: "김민수",
    amount: 500_000,
    memo: "경조사비",
    cancelable: false,
  },
  {
    id: "rsv3",
    status: "실패",
    scheduledDate: daysAgo(9),
    registeredAt: `${daysAgo(16)}T16:22:00`,
    fromAccountNo: "255104778910",
    fromAlias: "비상금통장",
    toAccountNo: "999911223344",
    payeeName: "최유진",
    amount: 1_000_000,
    memo: "-",
    cancelable: false,
  },
  {
    id: "rsv2",
    status: "취소",
    scheduledDate: daysAgo(11),
    registeredAt: `${daysAgo(20)}T08:45:00`,
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "444401122938",
    payeeName: "이서연",
    amount: 200_000,
    memo: "-",
    cancelable: false,
  },
  {
    id: "rsv1",
    status: "완료",
    scheduledDate: daysAgo(21),
    registeredAt: `${daysAgo(26)}T13:10:00`,
    fromAccountNo: "302998112233",
    fromAlias: "급여통장",
    toAccountNo: "110550098213",
    payeeName: "박지훈",
    amount: 2_000_000,
    memo: "월세",
    cancelable: false,
  },
]
