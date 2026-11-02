import { useVerifyAccountPasswordMutation } from "@/entities/account/api/account-password-mutations"
import { ApiError } from "@/shared/api/api-error"

type VerifyAccountPasswordParams = {
  accountId: number
  accountPassword: string
  clearPassword: () => void
}

type AccountPasswordVerificationResult =
  | {
      ok: true
      token: string
    }
  | {
      ok: false
      message: string
    }

export const useAccountPasswordVerification = () => {
  const mutation = useVerifyAccountPasswordMutation()

  const verify = async ({
    accountId,
    accountPassword,
    clearPassword,
  }: VerifyAccountPasswordParams): Promise<AccountPasswordVerificationResult> => {
    try {
      const response = await mutation.mutateAsync({
        accountId,
        data: {
          accountPassword,
        },
      })

      if (!response.accountPasswordAuthToken) {
        return {
          ok: false,
          message:
            "계좌비밀번호 인증 토큰을 발급받지 못했습니다. 다시 시도해 주세요.",
        }
      }

      return {
        ok: true,
        token: response.accountPasswordAuthToken,
      }
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof ApiError
            ? error.message
            : "계좌비밀번호 인증에 실패했습니다.",
      }
    } finally {
      // 성공·실패 여부와 관계없이 평문 비밀번호와 mutation variables를 남기지 않는다.
      clearPassword()
      mutation.reset()
    }
  }

  return {
    verify,
    isPending: mutation.isPending,
    reset: mutation.reset,
  }
}
