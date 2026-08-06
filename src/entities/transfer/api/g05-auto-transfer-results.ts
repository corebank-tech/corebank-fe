/**
 * G-05 자동이체결과 조회 목업 데이터. REQ-AUTO-018·019.
 * 회차 처리결과는 이체 처리상태 코드(정상/오류)를 그대로 사용한다.
 */

export type AutoTransferResult = "정상" | "오류"

export type AutoTransferResultRow = {
  id: string
  result: AutoTransferResult
  /** 처리일시 ISO datetime. */
  processedAt: string
  fromAccountNo: string
  fromAlias: string
  toAccountNo: string
  payeeName: string
  amount: number
  cycleMonths: 1 | 3 | 6
  memo: string
  failReason?: string
}

export const MOCK_AUTO_TRANSFER_RESULTS: AutoTransferResultRow[] = [
  {
    id: "ar8",
    result: "정상",
    processedAt: "2026-07-21T00:10:00",
    fromAccountNo: "302998112233",
    fromAlias: "급여통장",
    toAccountNo: "110550098213",
    payeeName: "박지훈",
    amount: 187_400,
    cycleMonths: 1,
    memo: "관리비",
  },
  {
    id: "ar7",
    result: "정상",
    processedAt: "2026-07-05T00:10:00",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "110220093412",
    payeeName: "홍길동",
    amount: 500_000,
    cycleMonths: 1,
    memo: "내집마련적금",
  },
  {
    id: "ar6",
    result: "정상",
    processedAt: "2026-07-05T00:10:00",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "110770164529",
    payeeName: "홍길동",
    amount: 300_000,
    cycleMonths: 1,
    memo: "여행적금",
  },
  {
    id: "ar5",
    result: "오류",
    processedAt: "2026-06-21T00:10:00",
    fromAccountNo: "302998112233",
    fromAlias: "급여통장",
    toAccountNo: "110550098213",
    payeeName: "박지훈",
    amount: 187_400,
    cycleMonths: 1,
    memo: "관리비",
    failReason: "출금계좌 잔액 부족(AUT0015)",
  },
  {
    id: "ar4",
    result: "정상",
    processedAt: "2026-06-05T00:10:00",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "110220093412",
    payeeName: "홍길동",
    amount: 500_000,
    cycleMonths: 1,
    memo: "내집마련적금",
  },
  {
    id: "ar3",
    result: "정상",
    processedAt: "2026-05-21T00:10:00",
    fromAccountNo: "302998112233",
    fromAlias: "급여통장",
    toAccountNo: "110550098213",
    payeeName: "박지훈",
    amount: 187_400,
    cycleMonths: 1,
    memo: "관리비",
  },
  {
    id: "ar2",
    result: "정상",
    processedAt: "2026-05-05T00:10:00",
    fromAccountNo: "110632892336",
    fromAlias: "자유입출금",
    toAccountNo: "110220093412",
    payeeName: "홍길동",
    amount: 500_000,
    cycleMonths: 1,
    memo: "내집마련적금",
  },
  {
    id: "ar1",
    result: "정상",
    processedAt: "2026-04-15T00:10:00",
    fromAccountNo: "255104778910",
    fromAlias: "비상금통장",
    toAccountNo: "999911223344",
    payeeName: "최유진",
    amount: 100_000,
    cycleMonths: 3,
    memo: "부모님 용돈",
  },
]
