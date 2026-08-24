import { useMutation } from "@tanstack/react-query"
import { executeTransfer, getTransferPayee } from "@/shared/api/generated"
import type {
  PayeeResponse,
  TransferRequest,
  TransferResponse,
} from "@/shared/api/generated"

export type InstantTransferResult = TransferResponse
export type Payee = PayeeResponse

export type ExecuteTransferVariables = {
  request: TransferRequest
  accountPasswordAuthToken: string
  otpAuthToken: string
  idempotencyKey: string
}

/** D-01 수취인 조회(REQ-TRSF-004). 계좌번호 입력을 마친 시점에만 부른다. */
export const fetchPayee = (accountNumber: string): Promise<PayeeResponse> =>
  getTransferPayee({ accountNumber })

/**
 * D-01 이체 실행(REQ-TRSF-009). 헤더 세 개를 요구한다 —
 * 멱등키, 계좌비밀번호 인증 토큰, OTP 인증 토큰.
 *
 * 멱등키는 화면이 한 번 만들어 넘긴다. 재제출마다 새로 만들면 서버가 같은 요청을
 * 별개 거래로 처리한다(REQ-CMN-014).
 */
export const useExecuteTransferMutation = () =>
  useMutation({
    mutationFn: ({
      request,
      accountPasswordAuthToken,
      otpAuthToken,
      idempotencyKey,
    }: ExecuteTransferVariables) =>
      executeTransfer(request, {
        headers: {
          "Idempotency-Key": idempotencyKey,
          "Account-Password-Auth-Token": accountPasswordAuthToken,
          "Otp-Auth-Token": otpAuthToken,
        },
      }),
  })
