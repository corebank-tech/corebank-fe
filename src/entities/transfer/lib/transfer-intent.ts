/**
 * REQ-TRSF-016: 멱등키는 거래 하나를 가리킨다.
 *
 * 실행이 미상으로 끝난 뒤 같은 거래를 다시 보낼 때는 키를 유지해야 서버가 중복을
 * 걸러낸다. 반대로 사용자가 금액이나 수취인을 바꿔 다시 보내면 다른 거래이므로
 * 키를 버려야 한다 — 같은 키로 보내면 서버가 앞선 거래의 결과를 돌려주고, 화면은
 * 바뀐 내용으로 이체된 것처럼 표시한다.
 *
 * 판정을 특정 setter 가 아니라 거래 내용 자체에 붙인다. 폼을 고치는 자리가 늘어도
 * 이 비교를 지나가므로 규칙이 새로 뚫리지 않는다.
 */
export type TransferIntent = {
  withdrawalAccountId: number | null
  depositAccountNumber: string
  amount: number | null
  myPassbookMemo: string
  recipientPassbookMemo: string
}

/** 실행 요청 본문이 되는 값이 하나라도 다르면 다른 거래다. */
export const isSameTransferIntent = (
  a: TransferIntent | null,
  b: TransferIntent,
): boolean =>
  a != null &&
  a.withdrawalAccountId === b.withdrawalAccountId &&
  a.depositAccountNumber === b.depositAccountNumber &&
  a.amount === b.amount &&
  a.myPassbookMemo === b.myPassbookMemo &&
  a.recipientPassbookMemo === b.recipientPassbookMemo
