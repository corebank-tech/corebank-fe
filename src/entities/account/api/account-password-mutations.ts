import {
  useUpdateAccountPassword,
  useVerifyAccountPassword,
} from "@/shared/api/generated"

export const useVerifyAccountPasswordMutation = () => useVerifyAccountPassword()

export const useUpdateAccountPasswordMutation = () => useUpdateAccountPassword()
