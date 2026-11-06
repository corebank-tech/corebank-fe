import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getListMyPaymentStopsQueryKey,
  submitMyObjection,
  submitMyObjectionSupplement,
  useListMyPaymentStops,
  type MyPaymentStopResponse,
} from "@/shared/api/generated"
import { withIdempotencyKey } from "@/shared/api/custom-fetch"

/**
 * 고객 비대면 이의제기 API(이의제기 2차 계약 §4, 계획 PA-20, PA-21).
 *
 * 생성 클라이언트가 multipart 본문(FormData)을 직접 만든다. `customFetch` 는 FormData
 * 에 Content-Type 을 붙이지 않아 브라우저가 경계 문자열을 넣고, CSRF 헤더와 멱등키는
 * 다른 변경 요청과 같이 붙인다.
 *
 * 생성 타입은 전 필드가 선택이라 화면 모델로 한 번 채운다.
 */

export type MyPaymentStop = {
  caseId: number
  accountNumberMasked: string
  disputedTotal: number
  objectionDeadline: string
  /** 이의제기를 아직 내지 않았으면 `null` */
  objectionId: number | null
  /** 계약 §1 `ObjectionStatus`. 이의제기를 아직 내지 않았으면 `null` */
  objectionStatus: string | null
  /** 보완 요청 중일 때만 있다 */
  supplementDue: string | null
  missingDocuments: string[]
}

const toMyPaymentStop = (response: MyPaymentStopResponse): MyPaymentStop => ({
  caseId: response.caseId ?? 0,
  accountNumberMasked: response.accountNumberMasked ?? "",
  disputedTotal: response.disputedTotal ?? 0,
  objectionDeadline: response.objectionDeadline ?? "",
  objectionId: response.objectionId ?? null,
  objectionStatus: response.objectionStatus ?? null,
  supplementDue: response.supplementDue ?? null,
  missingDocuments: response.missingDocuments ?? [],
})

/** 내 지급정지 사건 목록(`GET /payment-stops/my`). */
export const useMyPaymentStops = () => {
  const { data, isPending, isError, error, refetch, isFetching } =
    useListMyPaymentStops()
  return {
    cases: data?.map(toMyPaymentStop),
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  }
}

export type MyObjectionDraft = {
  clause: number
  statement: string
  simplifiedRequested: boolean
  litigationPending: boolean
  idCopy: File
  evidence: File[]
}

export type MyObjectionSupplementDraft = {
  evidence: File[]
  note: string
}

/**
 * 멱등키를 묶을 내용. 파일은 `JSON.stringify` 가 `{}` 로 만들어 버려서 이름, 크기,
 * 수정 시각으로 바꿔 넣는다. 파일을 바꾸면 새 키, 같은 파일로 다시 보내면 같은 키다.
 */
const fileFingerprint = (file: File) => [
  file.name,
  file.size,
  file.lastModified,
]

export const myObjectionFingerprint = (
  caseId: number,
  draft: MyObjectionDraft,
) => ({
  caseId,
  clause: draft.clause,
  statement: draft.statement,
  simplifiedRequested: draft.simplifiedRequested,
  litigationPending: draft.litigationPending,
  idCopy: fileFingerprint(draft.idCopy),
  evidence: draft.evidence.map(fileFingerprint),
})

export const mySupplementFingerprint = (
  objectionId: number,
  draft: MyObjectionSupplementDraft,
) => ({
  objectionId,
  note: draft.note,
  evidence: draft.evidence.map(fileFingerprint),
})

/**
 * 이의제기 신청(`POST /payment-stops/{caseId}/objections`). 1사건 1이의제기다.
 * 응답 시간 초과 뒤 같은 키로 다시 보내면 서버가 처음 접수 결과를 돌려준다.
 */
export const useSubmitMyObjection = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      caseId,
      draft,
      idempotencyKey,
    }: {
      caseId: number
      draft: MyObjectionDraft
      idempotencyKey: string
    }) =>
      submitMyObjection(
        caseId,
        {
          clause: draft.clause,
          statement: draft.statement,
          simplifiedRequested: draft.simplifiedRequested,
          litigationPending: draft.litigationPending,
          idCopy: draft.idCopy,
          evidence: draft.evidence,
        },
        withIdempotencyKey({}, idempotencyKey),
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getListMyPaymentStopsQueryKey(),
      }),
  })
}

/**
 * 보완 서류 제출(`POST /objections/{objectionId}/supplements`). 보완 요청 상태에서만
 * 받는다. 제출하면 이의제기가 보완 서류 확인 중으로 바뀐다.
 */
export const useSubmitMyObjectionSupplement = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      objectionId,
      draft,
      idempotencyKey,
    }: {
      objectionId: number
      draft: MyObjectionSupplementDraft
      idempotencyKey: string
    }) =>
      submitMyObjectionSupplement(
        objectionId,
        {
          evidence: draft.evidence,
          // 빈 메모는 보내지 않는다. 생성 클라이언트는 `undefined` 만 건너뛴다
          note: draft.note.trim() === "" ? undefined : draft.note.trim(),
        },
        withIdempotencyKey({}, idempotencyKey),
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getListMyPaymentStopsQueryKey(),
      }),
  })
}
