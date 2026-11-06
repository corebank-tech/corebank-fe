import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import {
  approveObjectionDecision,
  confirmObjectionCompleteness,
  getGetObjectionDetailQueryKey,
  getGetObjectionDocumentContentQueryKey,
  getGetObjectionDocumentContentUrl,
  getListObjectionExternalChecksQueryKey,
  getListObjectionNoticesQueryKey,
  getListObjectionsQueryKey,
  requestObjectionExternalCheck,
  requestObjectionSupplement,
  returnObjectionDecision,
  startObjectionReviewSession,
  useGetObjectionDocumentOcr,
  useListObjectionDocuments,
  useListObjectionExternalChecks,
  useListObjectionLedger,
  useListObjectionNotices,
  type ExternalCheckRequest,
  type ObjectionDocumentResponse,
  type ObjectionLedgerEntryResponse,
  type ObjectionNoticeResponse,
  type OcrPage as OcrPageResponse,
  type SupplementRequest,
} from "@/shared/api/generated"
import { fetchBinary, withIdempotencyKey } from "@/shared/api/custom-fetch"
import {
  toDecision,
  toExternalCheck,
} from "@/entities/payment-stop/api/objection"

/**
 * 이의제기 심사 운영 API(계약 v2 §3, 계획 PA-10, PA-12).
 *
 * 소명 완비 확인, 보완 요청, 2인 승인, 외부 확인 모의, 통지 기록, 첨부 서류와 판독 결과,
 * 원장 타임라인을 여기 모은다. 상태를 바꾸는 요청은 모두 화면이 정한 멱등키를 받는다.
 */

const ACCESS_REASON_HEADER = "X-Access-Reason"

type Keyed<T> = T & { objectionId: number; idempotencyKey: string }

/**
 * 이의제기 하나의 상태가 바뀐 뒤 다시 받을 쿼리. 상세(사유가 키 뒤에 붙는다), 목록,
 * 통지 기록, 외부 확인을 다시 받는다. 분석 타임라인은 상태 변경과 무관해 건드리지 않는다.
 */
const invalidateObjection = (queryClient: QueryClient, objectionId: number) =>
  Promise.all([
    queryClient.invalidateQueries({
      queryKey: getGetObjectionDetailQueryKey(objectionId),
    }),
    queryClient.invalidateQueries({ queryKey: getListObjectionsQueryKey() }),
    queryClient.invalidateQueries({
      queryKey: getListObjectionNoticesQueryKey(objectionId),
    }),
    queryClient.invalidateQueries({
      queryKey: getListObjectionExternalChecksQueryKey(objectionId),
    }),
  ])

/** 소명 완비 확인. 심사 기한이 이때 정해진다. 다른 상태면 `PST0308` 이다. */
export const useConfirmCompleteness = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ objectionId, idempotencyKey }: Keyed<object>) =>
      confirmObjectionCompleteness(
        objectionId,
        withIdempotencyKey({}, idempotencyKey),
      ),
    onSettled: (_data, _error, { objectionId }) =>
      invalidateObjection(queryClient, objectionId),
  })
}

/** 보완 요청. 2회까지 받고 3회째는 `PST0006` 이다. */
export const useRequestSupplement = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      objectionId,
      request,
      idempotencyKey,
    }: Keyed<{ request: SupplementRequest }>) =>
      requestObjectionSupplement(
        objectionId,
        request,
        withIdempotencyKey({}, idempotencyKey),
      ),
    onSettled: (_data, _error, { objectionId }) =>
      invalidateObjection(queryClient, objectionId),
  })
}

/**
 * 심사 시작 기록(처리시간 평가용). 상세를 연 시각을 남길 뿐이라 화면은 실패를 무시한다.
 */
export const useStartReviewSession = () =>
  useMutation({
    mutationFn: ({ objectionId, idempotencyKey }: Keyed<object>) =>
      startObjectionReviewSession(
        objectionId,
        withIdempotencyKey({}, idempotencyKey),
      ),
  })

/**
 * 승인 대기 판정 승인. 작성자와 같은 사람이면 `PST0309`, 이미 처리됐으면 `PST0204` 다.
 * 서버가 승인 직전에 해제 요건을 다시 계산하므로 `PST0301` 도 올 수 있다. 어느 쪽이든
 * 화면의 상세가 서버보다 늦었다는 뜻이라 성공과 실패 모두 다시 받는다.
 */
export const useApproveDecision = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      objectionId,
      decisionId,
      idempotencyKey,
    }: Keyed<{ decisionId: number }>) =>
      toDecision(
        await approveObjectionDecision(
          objectionId,
          decisionId,
          withIdempotencyKey({}, idempotencyKey),
        ),
      ),
    onSettled: (_data, _error, { objectionId }) =>
      invalidateObjection(queryClient, objectionId),
  })
}

/** 승인 대기 판정 반려. 이의제기는 심사 중으로 돌아가 작성자가 다시 쓴다. */
export const useReturnDecision = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      objectionId,
      decisionId,
      reason,
      idempotencyKey,
    }: Keyed<{ decisionId: number; reason: string }>) =>
      toDecision(
        await returnObjectionDecision(
          objectionId,
          decisionId,
          { reason },
          withIdempotencyKey({}, idempotencyKey),
        ),
      ),
    onSettled: (_data, _error, { objectionId }) =>
      invalidateObjection(queryClient, objectionId),
  })
}

/** 외부 확인 목록. 상세 응답에도 실리지만 요청 뒤 이 목록만 다시 받는다. */
export const useExternalChecks = (objectionId: number) => {
  const { data, isPending } = useListObjectionExternalChecks(objectionId)
  return { checks: data?.map(toExternalCheck), isPending }
}

/**
 * 외부 확인 요청(모의). 요청 즉시 지정한 회신으로 끝난다. 같은 기관에 다시 보내면 서버가
 * 기존 행을 돌려준다. 회신은 해제 요건 점검에 들어가므로 상세도 다시 받는다.
 */
export const useRequestExternalCheck = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      objectionId,
      request,
      idempotencyKey,
    }: Keyed<{ request: ExternalCheckRequest }>) =>
      toExternalCheck(
        await requestObjectionExternalCheck(
          objectionId,
          request,
          withIdempotencyKey({}, idempotencyKey),
        ),
      ),
    onSettled: (_data, _error, { objectionId }) =>
      invalidateObjection(queryClient, objectionId),
  })
}

export type ObjectionNotice = {
  noticeId: number
  /** `HOLDER`, `VICTIM`, `FSS`, `RELATED_BANK` */
  target: string
  /** `RECEIPT`, `SUPPLEMENT_REQUEST`, `DECISION_*`, `STOP_TERMINATED` */
  kind: string
  /** `SMS`, `DOCUMENT` */
  channel: string
  basis: string
  recordedAt: string | null
}

const toNotice = (response: ObjectionNoticeResponse): ObjectionNotice => ({
  noticeId: response.noticeId ?? 0,
  target: response.target ?? "",
  kind: response.kind ?? "",
  channel: response.channel ?? "",
  basis: response.basis ?? "",
  recordedAt: response.recordedAt ?? null,
})

/** 통지 기록. 실제 발송은 없고 기록만 있다(D30). */
export const useObjectionNotices = (objectionId: number) => {
  const { data, isPending } = useListObjectionNotices(objectionId)
  return { notices: data?.map(toNotice), isPending }
}

export type ObjectionDocument = {
  documentId: number
  /** `EVIDENCE`, `ID_COPY` */
  kind: string
  fileName: string
  contentType: string
  size: number
  sha256: string
  /** 0 접수, 1~2 보완 회차 */
  round: number
  uploadedAt: string | null
  /** `PENDING`, `DONE`, `FAILED`. 신분증 사본은 판독하지 않아 `null` 이다 */
  ocrStatus: string | null
}

const toDocument = (
  response: ObjectionDocumentResponse,
): ObjectionDocument => ({
  documentId: response.documentId ?? 0,
  kind: response.kind ?? "",
  fileName: response.fileName ?? "",
  contentType: response.contentType ?? "",
  size: response.size ?? 0,
  sha256: response.sha256 ?? "",
  round: response.round ?? 0,
  uploadedAt: response.uploadedAt ?? null,
  ocrStatus: response.ocrStatus || null,
})

export const useObjectionDocuments = (objectionId: number) => {
  const { data, isPending, isError } = useListObjectionDocuments(objectionId)
  return { documents: data?.map(toDocument), isPending, isError }
}

export type OcrRegion = {
  /** 서류 전체에서 0부터 이어지는 번호. 쪽이 바뀌어도 다시 0이 되지 않는다 */
  index: number
  text: string
  /** 페이지 좌표 `[x, y, w, h]` */
  bbox: [number, number, number, number]
  confidence: number | null
}

export type OcrPage = {
  page: number
  width: number
  height: number
  regions: OcrRegion[]
}

const toOcrPage = (response: OcrPageResponse): OcrPage => ({
  page: response.page ?? 1,
  width: response.width ?? 0,
  height: response.height ?? 0,
  regions: (response.regions ?? [])
    .filter((region) => region.bbox?.length === 4)
    .map((region) => ({
      index: region.index ?? 0,
      text: region.text ?? "",
      bbox: region.bbox as [number, number, number, number],
      confidence: region.confidence ?? null,
    })),
})

/** 서류 판독 결과. 텍스트는 서버가 가명 처리한 값이다. 판독 전이면 요청하지 않는다. */
export const useDocumentOcr = (
  objectionId: number,
  documentId: number | null,
  enabled: boolean,
) => {
  const { data, isPending, isError } = useGetObjectionDocumentOcr(
    objectionId,
    documentId ?? 0,
    { query: { enabled: enabled && documentId != null } },
  )
  return { pages: data?.pages?.map(toOcrPage), isPending, isError }
}

/**
 * 서류 파일 바이트. 상세와 같은 조회 사유를 보낸다(조회 감사). 쿼리 키에 사유를 넣는 이유는
 * 상세와 같다 — 사유를 바꾸면 다시 받아 바뀐 사유가 감사에 남는다.
 */
export const useDocumentContent = (
  objectionId: number,
  documentId: number | null,
  accessReason: string | null,
) =>
  useQuery({
    queryKey: [
      ...getGetObjectionDocumentContentQueryKey(objectionId, documentId ?? 0),
      accessReason,
    ],
    enabled: documentId != null && accessReason != null,
    staleTime: Infinity,
    queryFn: ({ signal }) =>
      fetchBinary(
        getGetObjectionDocumentContentUrl(objectionId, documentId ?? 0),
        {
          signal,
          headers: accessReason
            ? { [ACCESS_REASON_HEADER]: accessReason }
            : undefined,
        },
      ),
  })

export type LedgerEntry = {
  transactionNumber: string
  /** `DEPOSIT`, `WITHDRAWAL` */
  direction: string
  interbank: boolean
  /** 상대 계좌. 타행이면 `null` */
  counterpartyAccountId: number | null
  amount: number
  occurredAt: string
  disputed: boolean
  /** 다툼 거래 중 가장 이른 시각 이후의 거래. 정상 근거로 쓰지 않는다 */
  afterDispute: boolean
}

const toLedgerEntry = (
  response: ObjectionLedgerEntryResponse,
): LedgerEntry => ({
  transactionNumber: response.transactionNumber ?? "",
  direction: response.direction ?? "",
  interbank: response.interbank ?? false,
  counterpartyAccountId: response.counterpartyAccountId ?? null,
  amount: response.amount ?? 0,
  occurredAt: response.occurredAt ?? "",
  disputed: response.disputed ?? false,
  afterDispute: response.afterDispute ?? false,
})

/** 지급정지 계좌 원장(해제 요건 점검 창 기간). 원장 타임라인 차트가 쓴다. */
export const useObjectionLedger = (objectionId: number) => {
  const { data, isPending, isError } = useListObjectionLedger(objectionId)
  return {
    entries: data?.map(toLedgerEntry).filter((entry) => entry.occurredAt),
    isPending,
    isError,
  }
}
