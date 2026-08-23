import { useMutation, useQuery } from "@tanstack/react-query"
import {
  checkSignupTerms,
  checkUserId,
  completeSignup,
  getGetSignupConfirmationQueryKey,
  getGetSignupTermsQueryKey,
  getSignupConfirmation,
  getSignupTerms,
  issueEmailVerification,
  validateSignup,
  verifyEmail,
  verifySignupAccount,
  type CheckTermsAgreementRequest,
  type CheckUserIdRequest,
  type CompleteSignupRequest,
  type IssueEmailVerificationRequest,
  type ValidateSignupRequest,
  type VerifyEmailRequest,
  type VerifySignupAccountRequest,
} from "@/shared/api/generated"
import { withIdempotencyKey } from "@/shared/api/custom-fetch"

/**
 * customFetch는 공통 응답의 data를 벗겨서 반환하지만,
 * generated 타입에는 ApiResponse<T>가 남아 있으므로 실제 런타임 타입으로 보정한다.
 */
export const useSignupTermsQuery = () =>
  useQuery({
    queryKey: getGetSignupTermsQueryKey(),
    queryFn: ({ signal }) => getSignupTerms({ signal }),
  })

export const useCheckSignupTermsMutation = () =>
  useMutation({
    mutationFn: (request: CheckTermsAgreementRequest) =>
      checkSignupTerms(request),
  })

export const useVerifySignupAccountMutation = () =>
  useMutation({
    mutationFn: (request: VerifySignupAccountRequest) =>
      verifySignupAccount(request),
  })

export const useCheckSignupUserIdMutation = () =>
  useMutation({
    mutationFn: (request: CheckUserIdRequest) => checkUserId(request),
  })

export const useIssueSignupEmailVerificationMutation = () =>
  useMutation({
    mutationFn: (request: IssueEmailVerificationRequest) =>
      issueEmailVerification(request),
  })

type VerifySignupEmailVariables = {
  emailVerificationId: string
  request: VerifyEmailRequest
}

export const useVerifySignupEmailMutation = () =>
  useMutation({
    mutationFn: ({
      emailVerificationId,
      request,
    }: VerifySignupEmailVariables) => verifyEmail(emailVerificationId, request),
  })

export const useValidateSignupMutation = () =>
  useMutation({
    mutationFn: (request: ValidateSignupRequest) => validateSignup(request),
  })

export const useSignupConfirmationQuery = (tempSignupToken?: string) =>
  useQuery({
    queryKey: [...getGetSignupConfirmationQueryKey(), tempSignupToken],
    enabled: Boolean(tempSignupToken),
    queryFn: ({ signal }) =>
      getSignupConfirmation({
        signal,
        headers: {
          "X-Signup-Token": tempSignupToken!,
        },
      }),
  })

type CompleteSignupVariables = {
  tempSignupToken: string
  idempotencyKey: string
}

export const useCompleteSignupMutation = () =>
  useMutation({
    mutationFn: ({
      tempSignupToken,
      idempotencyKey,
    }: CompleteSignupVariables) => {
      const request: CompleteSignupRequest = {
        tempSignupToken,
      }

      return completeSignup(request, withIdempotencyKey({}, idempotencyKey))
    },
  })
