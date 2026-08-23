import { useMutation, useQuery } from "@tanstack/react-query"
import {
  checkTerms,
  getGetTermsQueryKey,
  getTerms,
} from "@/shared/api/generated/signup-terms-controller/signup-terms-controller"

import { verifyAccount } from "@/shared/api/generated/signup-account-verification-controller/signup-account-verification-controller"

import {
  checkUserId,
  issueEmailVerification,
  verifyEmail,
} from "@/shared/api/generated/signup-identity-controller/signup-identity-controller"
import {
  getConfirmation,
  validate1,
} from "@/shared/api/generated/signup-progress-controller/signup-progress-controller"
import type {
  CheckTermsAgreementRequest,
  SignupTermsResponse,
  TermsAuthTokenResponse,
  VerifySignupAccountRequest,
  VerifySignupAccountResponse,
  CheckUserIdRequest,
  CheckUserIdResponse,
  IssueEmailVerificationRequest,
  IssueEmailVerificationResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ValidateSignupRequest,
  ValidateSignupResponse,
  SignupConfirmationResponse,
  CompleteSignupResponse,
} from "@/shared/api/generated/model"
import { customFetch, withIdempotencyKey } from "@/shared/api/custom-fetch"

/**
 * customFetch는 공통 응답의 data를 벗겨서 반환하지만,
 * generated 타입에는 ApiResponse<T>가 남아 있으므로 실제 런타임 타입으로 보정한다.
 */
export const useSignupTermsQuery = () =>
  useQuery({
    queryKey: getGetTermsQueryKey(),
    queryFn: ({ signal }) =>
      getTerms({ signal }) as unknown as Promise<SignupTermsResponse>,
  })

export const useCheckSignupTermsMutation = () =>
  useMutation({
    mutationFn: (request: CheckTermsAgreementRequest) =>
      checkTerms(request) as unknown as Promise<TermsAuthTokenResponse>,
  })

export const useVerifySignupAccountMutation = () =>
  useMutation({
    mutationFn: (request: VerifySignupAccountRequest) =>
      verifyAccount(request) as unknown as Promise<VerifySignupAccountResponse>,
  })

export const useCheckSignupUserIdMutation = () =>
  useMutation({
    mutationFn: (request: CheckUserIdRequest) =>
      checkUserId(request) as unknown as Promise<CheckUserIdResponse>,
  })

export const useIssueSignupEmailVerificationMutation = () =>
  useMutation({
    mutationFn: (request: IssueEmailVerificationRequest) =>
      issueEmailVerification(
        request,
      ) as unknown as Promise<IssueEmailVerificationResponse>,
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
    }: VerifySignupEmailVariables) =>
      verifyEmail(
        emailVerificationId,
        request,
      ) as unknown as Promise<VerifyEmailResponse>,
  })

export const useValidateSignupMutation = () =>
  useMutation({
    mutationFn: (request: ValidateSignupRequest) =>
      validate1(request) as unknown as Promise<ValidateSignupResponse>,
  })

export const useSignupConfirmationQuery = (tempSignupToken?: string) =>
  useQuery({
    queryKey: ["signup-confirmation", tempSignupToken],
    enabled: Boolean(tempSignupToken),
    queryFn: ({ signal }) =>
      getConfirmation({
        signal,
        headers: {
          "X-Signup-Token": tempSignupToken!,
        },
      }) as unknown as Promise<SignupConfirmationResponse>,
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
    }: CompleteSignupVariables) =>
      customFetch<CompleteSignupResponse>(
        "/auth/signup/complete",
        withIdempotencyKey(
          {
            method: "POST",
            body: JSON.stringify({
              tempSignupToken,
            }),
          },
          idempotencyKey,
        ),
      ),
  })
