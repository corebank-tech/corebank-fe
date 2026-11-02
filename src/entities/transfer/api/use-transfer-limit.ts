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
  accountPasswordAuthToken: string
  otpAuthToken: string
  idempotencyKey: string
}

/** D-05 이체한도 조회(REQ-TRSF-024). */
export const useTransferLimitQuery = () => useGetTransferLimit()

export const getTransferLimitQueryKey = () => getGetTransferLimitQueryKey()

/**
 * D-05 이체한도 변경(REQ-TRSF-025). 계좌비밀번호 인증과 OTP 인증을 모두 거친
 * 토큰 두 개를 요구한다 — 서버 `api_conventions.md` §8-2 의 2단계 인증이다.
 *
 * 변경 요청이 실패하면 두 토큰 모두 되살아나지 않으므로 화면은 남은 토큰을 버리고
 * 두 인증을 처음부터 다시 받아야 한다(§6-3 복수 인증 토큰 소비 실패).
 *
 * 멱등키는 화면이 한 번 만들어 넘긴다. 재제출마다 새로 만들면 서버가 같은 요청을
 * 별개 거래로 처리한다(REQ-CMN-014).
 */
export const useUpdateTransferLimitMutation = () =>
  useMutation({
    mutationFn: ({
      oneTimeLimit,
      dailyLimit,
      accountPasswordAuthToken,
      otpAuthToken,
      idempotencyKey,
    }: UpdateTransferLimitVariables) =>
      updateTransferLimit(
        { oneTimeLimit, dailyLimit, accountPasswordAuthToken, otpAuthToken },
        withIdempotencyKey({}, idempotencyKey),
      ),
  })
