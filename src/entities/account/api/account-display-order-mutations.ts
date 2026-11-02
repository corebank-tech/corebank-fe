import {
  useResetAccountDisplayOrder,
  useSaveAccountDisplayOrder,
} from "@/shared/api/generated"

export const useSaveAccountDisplayOrderMutation = () =>
  useSaveAccountDisplayOrder()

export const useResetAccountDisplayOrderMutation = () =>
  useResetAccountDisplayOrder()
