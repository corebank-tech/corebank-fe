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
import type { TransferRequest } from "@/shared/api/generated"

export type TransferIntent = {
  withdrawalAccountId: number | null
  depositAccountNumber: string
  amount: number | null
  myPassbookMemo: string
  recipientPassbookMemo: string
}

/**
 * 실행 요청 본문을 이 값에서 만든다. 화면이 본문을 따로 조립하면 판정과 본문이
 * 갈려 비교가 무의미해진다 — 거래 내용을 말하는 자리를 하나로 둔다.
 *
 * `TransferRequest` 는 필드가 전부 optional 이라 어긋나도 타입이 잡아주지 않는다.
 */
export const toTransferRequest = (intent: TransferIntent): TransferRequest => ({
  withdrawalAccountId: intent.withdrawalAccountId ?? undefined,
  depositAccountNumber: intent.depositAccountNumber,
  amount: intent.amount ?? undefined,
  myPassbookMemo: intent.myPassbookMemo || undefined,
  recipientPassbookMemo: intent.recipientPassbookMemo || undefined,
})

/** OTP 발급 시점의 거래정보. 서버가 실행 요청과 대조한다(OTP0102). */
export const toOtpTransactionData = (intent: TransferIntent) => ({
  withdrawalAccountId: intent.withdrawalAccountId ?? undefined,
  depositAccountNumber: intent.depositAccountNumber,
  amount: intent.amount ?? undefined,
})

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
