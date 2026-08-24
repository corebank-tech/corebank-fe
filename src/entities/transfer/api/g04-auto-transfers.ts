import { getToday } from "@/shared/config/clock"
import { addMonths } from "@/shared/lib/date"

/**
 * G-04 자동이체 조회/변경/해지의 도메인 타입. REQ-AUTO-009·010·011.
 * 등록 상태는 POL-036의 3종(정상/종료/해지)만 사용한다 — POL-025 이체 처리상태와 혼동하지 말 것.
 */

export type AutoTransferStatus = "정상" | "종료" | "해지"
export type TransferCycle = 1 | 3 | 6

export type AutoTransferRow = {
  id: string
  fromAccountNo: string
  /** 출금계좌 별칭. 서버가 미설정 건에는 내려주지 않는다 — 화면은 빈 문자열도 미설정으로 본다. */
  fromAlias?: string
  toAccountNo: string
  payeeName: string
  amount: number
  cycleMonths: TransferCycle
  /** 이체지정일 1~31 */
  dayOfMonth: number
  /** 이체 시작일 ISO date */
  startDate: string
  /** 이체 종료일 ISO date */
  endDate: string
  memo: string
  status: AutoTransferStatus
  /** 상태가 '정상'인 건만 존재. */
  nextExecDate?: string
  /** REQ-AUTO-011: 서버가 판정한 해지 가능 여부. 다음 실행 예정일 당일이면 false다. */
  cancelable: boolean
}

/**
 * 이체지정일이 `dayOfMonth`인 달을 `monthOffset`만큼 옮긴 날짜.
 *
 * 자동이체는 시작일·종료일·다음 실행일의 '일'이 모두 이체지정일과 같아야 한다.
 * `daysAgo()`처럼 일 단위로 밀면 세 날짜의 일이 제각각이 되어 이체지정일과
 * 어긋나므로, 달만 옮기고 일은 고정한다.
 *
 * `dayOfMonth`는 1~28만 쓴다 — 29~31은 짧은 달에서 말일로 보정되어 이체지정일과
 * 벌어진다(POL-034의 보정 규칙은 실제 실행일에만 적용되는 것이고, 목업의 정합을
 * 흐리는 데 쓸 이유가 없다).
 */
const onDayOfMonth = (dayOfMonth: number, monthOffset: number): string =>
  addMonths(
    `${getToday().slice(0, 7)}-${String(dayOfMonth).padStart(2, "0")}`,
    monthOffset,
  )

/**
 * 오늘 이후 처음 돌아오는 이체지정일. 매월(주기 1개월) 자동이체 기준이다.
 *
 * 항상 오늘보다 뒤를 돌려주므로 이 목업에는 **다음 실행 예정일이 당일인 건이 없다** —
 * REQ-AUTO-011이 규정한 "당일 해지 거부"는 이 데이터로 재현되지 않는다. G-04는 서버가
 * 내려준 `cancelable`을 그대로 쓰고 이 목업은 B-05 삭제 차단(상태만 참조)에서만 읽히므로
 * 화면 동작에는 영향이 없다.
 */
const nextExecDateOn = (dayOfMonth: number): string => {
  const thisMonth = onDayOfMonth(dayOfMonth, 0)
  return thisMonth > getToday() ? thisMonth : onDayOfMonth(dayOfMonth, 1)
}

/**
 * **B-05 출금계좌 삭제 차단(REQ-ACCT-011)의 입력**이다. G-04는 서버 응답을 매핑해서 쓰므로
 * 화면도 스토리도 이 배열을 읽지 않는다 — 계좌번호와 상태 조합을 바꾸면 B-05에서 안내되는
 * 차단 사유만 달라진다.
 */
export const MOCK_AUTO_TRANSFERS: AutoTransferRow[] = [
  {
    id: "at5",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "110220093412",
    payeeName: "홍길동",
    amount: 500_000,
    cycleMonths: 1,
    dayOfMonth: 5,
    startDate: onDayOfMonth(5, -10),
    endDate: onDayOfMonth(5, 13),
    memo: "내집마련적금",
    status: "정상",
    nextExecDate: nextExecDateOn(5),
    cancelable: true,
  },
  {
    id: "at4",
    fromAccountNo: "302998112233",
    fromAlias: "급여통장",
    toAccountNo: "110550098213",
    payeeName: "박지훈",
    amount: 187_400,
    cycleMonths: 1,
    dayOfMonth: 21,
    startDate: onDayOfMonth(21, -30),
    endDate: onDayOfMonth(21, 18),
    memo: "관리비",
    status: "정상",
    nextExecDate: nextExecDateOn(21),
    cancelable: true,
  },
  {
    id: "at3",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "110770164529",
    payeeName: "홍길동",
    amount: 300_000,
    cycleMonths: 1,
    dayOfMonth: 5,
    startDate: onDayOfMonth(5, -3),
    endDate: onDayOfMonth(5, 3),
    memo: "여행적금",
    status: "정상",
    nextExecDate: nextExecDateOn(5),
    cancelable: true,
  },
  {
    id: "at2",
    fromAccountNo: "255104778910",
    fromAlias: "비상금통장",
    toAccountNo: "999911223344",
    payeeName: "최유진",
    amount: 100_000,
    cycleMonths: 3,
    dayOfMonth: 15,
    startDate: onDayOfMonth(15, -42),
    endDate: onDayOfMonth(15, -6),
    memo: "부모님 용돈",
    status: "종료",
    cancelable: false,
  },
  {
    id: "at1",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "444401122938",
    payeeName: "이서연",
    amount: 50_000,
    cycleMonths: 6,
    dayOfMonth: 1,
    startDate: onDayOfMonth(1, -25),
    endDate: onDayOfMonth(1, 11),
    memo: "동호회비",
    status: "해지",
    cancelable: false,
  },
]
