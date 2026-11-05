import { useMutation } from "@tanstack/react-query"
import {
  findId,
  issuePasswordReset,
  resetPassword,
  type FindIdRequest,
  type PasswordResetIssueRequest,
  type PasswordResetRequest,
} from "@/shared/api/generated"
import { withIdempotencyKey } from "@/shared/api/custom-fetch"

export const useFindIdMutation = () =>
  useMutation({
    mutationFn: (request: FindIdRequest) => findId(request),
  })

export const useIssuePasswordResetMutation = () =>
  useMutation({
    mutationFn: (request: PasswordResetIssueRequest) =>
      issuePasswordReset(request),
  })

type ResetPasswordVariables = {
  passwordResetRequestId: string
  request: PasswordResetRequest
  idempotencyKey: string
}

export const useResetPasswordMutation = () =>
  useMutation({
    mutationFn: ({
      passwordResetRequestId,
      request,
      idempotencyKey,
    }: ResetPasswordVariables) =>
      resetPassword(
        passwordResetRequestId,
        request,
        withIdempotencyKey({}, idempotencyKey),
      ),
  })
