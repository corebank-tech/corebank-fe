import { useMutation } from "@tanstack/react-query"
import {
  TransferResponseStatus,
  executeInterbankTransfer,
  executeTransfer,
  getTransferPayee,
} from "@/shared/api/generated"
import type { PayeeResponse, TransferResponse } from "@/shared/api/generated"
import { fetchInterbankPayee } from "@/entities/transfer/api/use-interbank-transfer"
import {
  toInterbankTransferRequest,
  toTransferRequest,
  type TransferIntent,
} from "@/entities/transfer/lib/transfer-intent"

export { TransferResponseStatus }

export type Payee = PayeeResponse

/**
 * 당행·타행 실행 응답의 공통 모양. 타행 응답에만 있는 `payeeName`(상대 은행이 돌려준
 * 예금주, SUCCESS 일 때만)을 더한다. 당행은 이체 전에 조회한 이름을 쓰므로 `null` 이다.
 */
export type InstantTransferResult = Pick<
  TransferResponse,
  | "status"
  | "transactionNumber"
  | "errorCode"
  | "errorMessage"
  | "withdrawalBalanceAfter"
> & {
  /** 오프셋 없는 KST 시각(당행 응답과 같은 모양). 실패·TIMEOUT 이면 비어 있다. */
  transferredAt?: string | null
  payeeName: string | null
}

export type ExecuteTransferVariables = {
  intent: TransferIntent
  accountPasswordAuthToken: string
  otpAuthToken: string
  idempotencyKey: string
}

/**
 * 타행 응답 시각의 `+09:00` 을 떼어 당행과 같은 오프셋 없는 KST 시각으로 맞춘다(서버
 * interbank_transfer_fe_handoff.md §5 — 당행 응답은 오프셋이 없어 같은 파서를 쓰지 않는다).
 * 그대로 두면 기기 시간대가 KST 가 아닐 때 당행은 KST 벽시계, 타행은 기기 시각으로 보인다.
 */
const toKstLocalDateTime = (value: string | null | undefined) =>
  value?.replace(/\+09:00$/, "") ?? value

/** D-01 당행 수취인 조회(REQ-TRSF-004). 계좌번호 입력을 마친 시점에만 부른다. */
export const fetchPayee = (accountNumber: string): Promise<PayeeResponse> =>
  getTransferPayee({ accountNumber })

/**
 * D-01 수취인 조회(REQ-TRSF-004, FE B-8). 입금은행이 `null` 이면 당행, 아니면 타행 조회다.
 * 실패는 둘 다 `ApiError` 로 던진다 — 화면은 서버 문구를 그대로 띄우고 [다음]을 막는다.
 */
export const fetchPayeeFor = async (
  payeeBankCode: string | null,
  accountNumber: string,
): Promise<{ payeeName: string }> => {
  const payee =
    payeeBankCode == null
      ? await fetchPayee(accountNumber)
      : await fetchInterbankPayee(payeeBankCode, accountNumber)
  return { payeeName: payee.payeeName ?? "" }
}

/**
 * D-01 이체 실행(REQ-TRSF-009, FE B-8). 거래 내용의 입금은행으로 당행·타행 API 를 고른다.
 * 본문과 OTP 거래정보가 같은 intent 에서 나와야 서버 대조(OTP0102)가 맞는다.
 *
 * 헤더 세 개는 당행·타행이 같다 — 멱등키, 계좌비밀번호 인증 토큰, OTP 인증 토큰.
 */
export const executeTransferIntent = async ({
  intent,
  accountPasswordAuthToken,
  otpAuthToken,
  idempotencyKey,
}: ExecuteTransferVariables): Promise<InstantTransferResult> => {
  const options = {
    headers: {
      "Idempotency-Key": idempotencyKey,
      "Account-Password-Auth-Token": accountPasswordAuthToken,
      "Otp-Auth-Token": otpAuthToken,
    },
  }

  if (intent.payeeBankCode == null) {
    const response = await executeTransfer(toTransferRequest(intent), options)
    return { ...response, payeeName: null }
  }
  const response = await executeInterbankTransfer(
    toInterbankTransferRequest(intent),
    options,
  )
  return {
    status: response.status,
    transactionNumber: response.transactionNumber,
    transferredAt: toKstLocalDateTime(response.transferredAt),
    errorCode: response.errorCode,
    errorMessage: response.errorMessage,
    withdrawalBalanceAfter: response.withdrawalBalanceAfter ?? undefined,
    payeeName: response.payeeName ?? null,
  }
}

/**
 * 멱등키는 화면이 한 번 만들어 넘긴다. 재제출마다 새로 만들면 서버가 같은 요청을
 * 별개 거래로 처리한다(REQ-CMN-014).
 */
export const useExecuteTransferMutation = () =>
  useMutation({ mutationFn: executeTransferIntent })
