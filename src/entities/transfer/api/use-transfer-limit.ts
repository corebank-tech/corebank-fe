import { useMutation } from "@tanstack/react-query"
import {
  getGetTransferLimitQueryKey,
  updateTransferLimit,
  useGetTransferLimit,
} from "@/shared/api/generated"
import type { TransferLimitResponse } from "@/shared/api/generated"
import { withIdempotencyKey } from "@/shared/api/custom-fetch"

export type TransferLimit = TransferLimitResponse

export type UpdateTransferLimitVariables = {
  oneTimeLimit: number
  dailyLimit: number
  otpAuthToken: string
  idempotencyKey: string
}

/** D-05 이체한도 조회(REQ-TRSF-024). */
export const useTransferLimitQuery = () => useGetTransferLimit()

export const getTransferLimitQueryKey = () => getGetTransferLimitQueryKey()

/**
 * D-05 이체한도 변경(REQ-TRSF-025). OTP 인증 토큰이 필수다.
 *
 * 멱등키는 화면이 한 번 만들어 넘긴다. 재제출마다 새로 만들면 서버가 같은 요청을
 * 별개 거래로 처리한다(REQ-CMN-014).
 */
export const useUpdateTransferLimitMutation = () =>
  useMutation({
    mutationFn: ({
      oneTimeLimit,
      dailyLimit,
      otpAuthToken,
      idempotencyKey,
    }: UpdateTransferLimitVariables) =>
      updateTransferLimit(
        { oneTimeLimit, dailyLimit, otpAuthToken },
        withIdempotencyKey({}, idempotencyKey),
      ),
  })
