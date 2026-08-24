import {
  useRegisterWithdrawalAccount,
  useUnregisterWithdrawalAccount,
} from "@/shared/api/generated"

export const useRegisterWithdrawalAccountMutation = () =>
  useRegisterWithdrawalAccount()

export const useUnregisterWithdrawalAccountMutation = () =>
  useUnregisterWithdrawalAccount()
