import {
  useDeleteAccountAlias,
  useUpdateAccountAlias,
} from "@/shared/api/generated"

export const useUpdateAccountAliasMutation = () => useUpdateAccountAlias()

export const useDeleteAccountAliasMutation = () => useDeleteAccountAlias()
