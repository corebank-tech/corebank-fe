import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  useAccountPasswordVerification,
  useWithdrawAccounts,
} from "@/entities/account"
import {
  getTransferLimitQueryKey,
  useUpdateTransferLimitMutation,
} from "@/entities/transfer"
import { ApiError, toErrorMessage } from "@/shared/api/api-error"

export type LimitValues = {
  oneTimeLimit: number
  dailyLimit: number
}

type UseD05LimitChangeOptions = {
  /** 변경이 확정됐을 때. 폼이 입력을 비우고 성공 안내를 띄운다. */
  onChanged: () => void
}

/**
 * D-05 한도 변경의 2단계 인증을 소유한다 — 계좌비밀번호 토큰, OTP, 멱등키.
 *
 * 서버 `api_conventions.md` §8-2(2단계 인증)와 §6-3(복수 인증 토큰 소비 실패)이
 * 이 훅의 변경 출처다. 화면 레이아웃이나 한도 정책이 바뀌어도 여기는 그대로다.
 *
 * 한도는 고객 단위 자원이지만 계좌비밀번호 인증 토큰은 계좌에 묶이므로, 인증할
 * 계좌를 사용자가 고른다.
 */
export const useD05LimitChange = ({ onChanged }: UseD05LimitChangeOptions) => {
  const queryClient = useQueryClient()
  const {
    accounts,
    isLoading: isAccountsLoading,
    isError: isAccountsError,
    error: accountsError,
  } = useWithdrawAccounts()
  const passwordVerification = useAccountPasswordVerification()
  const updateMutation = useUpdateTransferLimitMutation()

  const [selectedAccountNo, setSelectedAccountNo] = React.useState("")
  const [accountPassword, setAccountPassword] = React.useState("")
  const [authError, setAuthError] = React.useState<string | null>(null)
  const [changeError, setChangeError] = React.useState<string | null>(null)
  const [passwordAuthToken, setPasswordAuthToken] = React.useState<
    string | null
  >(null)
  const [isOtpOpen, setOtpOpen] = React.useState(false)
  const [idempotencyKey, setIdempotencyKey] = React.useState("")
  /**
   * 멱등키에 묶인 한도값. 이 값이 그대로 서버로 나가고 OTP 거래내용으로도 쓰여,
   * 인증받은 내용과 보내는 내용이 어긋날 수 없다(§8-2 ④ 대조).
   */
  const [keyedLimits, setKeyedLimits] = React.useState<LimitValues | null>(null)

  /** 인증할 계좌를 고를 수 없으면 토큰을 못 받아 변경 자체가 불가능하다. */
  const isAccountUnavailable =
    isAccountsLoading || isAccountsError || accounts.length === 0
  /**
   * 계좌를 고를 수 없는 이유. 로딩과 실패를 한 문구로 뭉개면 "조회에 실패했다"가
   * 불러오는 중에도 뜬다. 실패 문구는 서버가 준 것을 그대로 쓴다(REQ-CMN-008).
   */
  const accountNotice = (() => {
    if (isAccountsLoading) return "계좌 목록을 불러오는 중입니다."
    if (isAccountsError) return toErrorMessage(accountsError)
    if (accounts.length === 0) {
      return "계좌비밀번호를 확인할 수 있는 이체 가능 계좌가 없어 한도를 변경할 수 없습니다."
    }
    return null
  })()

  const selectAccount = (accountNo: string) => {
    setSelectedAccountNo(accountNo)
    setAuthError(null)
    setPasswordAuthToken(null)
  }

  const changePassword = (value: string) => {
    setAccountPassword(value)
    setAuthError(null)
  }

  /** 새 제출을 시작할 때 이전 시도의 오류를 지운다. */
  const clearErrors = () => {
    setAuthError(null)
    setChangeError(null)
  }

  /**
   * 인증 상태를 비운다. 멱등키는 여기서만 버린다 — 실패한 변경을 같은 한도로 다시
   * 보낼 때는 같은 키를 써야 서버가 앞선 요청과 한 거래로 묶는다(REQ-CMN-014).
   */
  const reset = () => {
    setAccountPassword("")
    setAuthError(null)
    setChangeError(null)
    setPasswordAuthToken(null)
    setIdempotencyKey("")
    setKeyedLimits(null)
  }

  /** §8-2 ① 계좌비밀번호를 확인해 토큰을 받고 OTP 단계로 넘어간다. */
  const startAuth = async (limits: LimitValues) => {
    setChangeError(null)
    const account = accounts.find((a) => a.accountNumber === selectedAccountNo)
    if (account?.accountId == null) {
      setAuthError("선택한 계좌를 찾을 수 없습니다. 계좌를 다시 선택하세요.")
      return
    }

    const verified = await passwordVerification.verify({
      accountId: account.accountId,
      accountPassword,
      clearPassword: () => setAccountPassword(""),
    })
    if (!verified.ok) {
      setPasswordAuthToken(null)
      setAuthError(verified.message)
      return
    }

    setPasswordAuthToken(verified.token)
    setAuthError(null)

    const isSameLimitsAsKey =
      keyedLimits != null &&
      keyedLimits.oneTimeLimit === limits.oneTimeLimit &&
      keyedLimits.dailyLimit === limits.dailyLimit
    if (!isSameLimitsAsKey) {
      setIdempotencyKey(crypto.randomUUID())
    }
    setKeyedLimits(limits)
    setOtpOpen(true)
  }

  /** §8-2 ④ 두 토큰을 함께 보내 변경을 실행한다. */
  const submit = async (otpAuthToken: string) => {
    setOtpOpen(false)
    if (passwordAuthToken == null || keyedLimits == null) {
      setAuthError(
        "계좌비밀번호 확인 정보가 없습니다. 계좌비밀번호부터 다시 확인하세요.",
      )
      return
    }
    try {
      await updateMutation.mutateAsync({
        oneTimeLimit: keyedLimits.oneTimeLimit,
        dailyLimit: keyedLimits.dailyLimit,
        accountPasswordAuthToken: passwordAuthToken,
        otpAuthToken,
        idempotencyKey,
      })
      await queryClient.invalidateQueries({
        queryKey: getTransferLimitQueryKey(),
      })
      reset()
      onChanged()
    } catch (caught) {
      setChangeError(
        caught instanceof ApiError
          ? caught.message
          : "이체한도 변경에 실패했습니다.",
      )
    } finally {
      // 두 토큰은 서버가 이미 소비했고 되살아나지 않는다. 남은 것을 버려 다음 시도가
      // 계좌비밀번호 확인부터 다시 시작하게 한다(§6-3 복수 인증 토큰 소비 실패).
      setPasswordAuthToken(null)
      setAccountPassword("")
    }
  }

  return {
    accounts,
    accountNotice,
    isAccountsLoading,
    isAccountUnavailable,
    selectedAccountNo,
    selectAccount,
    accountPassword,
    changePassword,
    authError,
    changeError,
    clearErrors,
    isVerifying: passwordVerification.isPending,
    isChanging: updateMutation.isPending,
    isOtpOpen,
    closeOtp: () => setOtpOpen(false),
    keyedLimits,
    startAuth,
    submit,
    reset,
  }
}
