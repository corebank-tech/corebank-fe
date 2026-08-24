/** 계좌상태. 정상 계좌만 출금가능금액이 계좌잔액과 동일하다(REQ-INQR-008). */
export type AccountStatus = "정상" | "거래정지" | "해지"

/**
 * B-03 거래내역조회 상단 계좌상세정보(REQ-INQR-007)에 필요한 필드를 더한 계좌 정보.
 * AccountOption을 확장하므로 AccountSelectField 등 기존 소비처에는 그대로 전달할 수 있다.
 */

export type Transaction = {
  id: string
  /** 거래일자 ISO date (YYYY-MM-DD). */
  date: string
  /** 거래시각 (HH:mm:ss). */
  time: string
  /** 적요(거래유형). 자동이체 실행 건은 반드시 '자동이체'로 표시한다(REQ-INQR-011). */
  description: string
  /** 거래내용(통장 표시내용). */
  content: string
  withdraw: number
  deposit: number
  balance: number
  /** 거래채널. 예: 인터넷뱅킹 / 자동이체 / 예약이체 / 영업점 / ATM. */
  channel: string
}
