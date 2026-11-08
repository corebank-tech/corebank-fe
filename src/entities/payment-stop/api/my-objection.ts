import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"
import {
  getListMyPaymentStopsQueryKey,
  useListMyPaymentStops,
  type MyCaseResponse,
  type MyDocumentResponse,
  type SubmitResponse,
} from "@/shared/api/generated"
import {
  UPLOAD_TIMEOUT_MS,
  customFetch,
  withIdempotencyKey,
} from "@/shared/api/custom-fetch"

/**
 * 고객 비대면 이의제기 API(이의제기 2차 계약 §4, 계획 PA-20, PA-21).
 *
 * 제출 두 개는 생성 함수를 쓰지 않고 multipart 본문(FormData)을 여기서 만든다. 서버가
 * 글자 칸을 `@RequestParam` 으로 받아 스펙에는 쿼리 문자열로 나오고, 생성 함수는 소명
 * 원문과 전할 말을 주소에 싣는다. 주소는 접근 기록과 프록시 로그에 남으므로 본문의
 * 칸으로 보낸다. 서버는 multipart 칸도 같은 이름의 요청 값으로 읽는다.
 *
 * `customFetch` 는 FormData 에 Content-Type 을 붙이지 않아 브라우저가 경계 문자열을
 * 넣고, CSRF 헤더와 멱등키는 다른 변경 요청과 같이 붙인다. 첨부는 커서 기본 제한
 * 시간 대신 `UPLOAD_TIMEOUT_MS` 를 쓴다.
 *
 * 생성 타입은 전 필드가 선택이라 화면 모델로 한 번 채운다.
 */

export type MyPaymentStop = {
  caseId: number
  accountNumberMasked: string
  /** 지급정지 사건 상태: `STOPPED`, `PARTIAL`, `RELEASED` */
  caseStatus: string
  disputedTotal: number
  objectionDeadline: string
  /** 이의제기를 아직 내지 않았으면 `null` */
  objectionId: number | null
  /** 계약 §1 `ObjectionStatus`. 이의제기를 아직 내지 않았으면 `null` */
  objectionStatus: string | null
  /** 보완 요청 중일 때만 있다 */
  supplementDue: string | null
  missingDocuments: string[]
  /** 확정된 심사결과: `ACCEPTED`, `PARTIAL`, `REJECTED`. 확정 전이면 `null` */
  decisionResult: string | null
}

const toMyPaymentStop = (response: MyCaseResponse): MyPaymentStop => ({
  caseId: response.caseId ?? 0,
  accountNumberMasked: response.accountNumberMasked ?? "",
  caseStatus: response.caseStatus ?? "",
  disputedTotal: response.disputedTotal ?? 0,
  objectionDeadline: response.objectionDeadline ?? "",
  objectionId: response.objectionId ?? null,
  objectionStatus: response.objectionStatus ?? null,
  supplementDue: response.supplementDue ?? null,
  missingDocuments: response.missingDocuments ?? [],
  decisionResult: response.decisionResult || null,
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
 * 다시 제출해도 같은 결과만 나오는 거부. 사건이나 이의제기 상태가 이미 바뀌었다는 뜻이라
 * 화면은 다시 제출을 권하지 않고 목록으로 안내한다.
 *
 * - `PST0201` 본인 사건이 아니거나 해제됨, `PST0202` 본인 이의제기가 아님
 * - `PST0002` 신청 기한 지남, `PST0304` 이미 신청함(시간 초과 뒤 접수가 끝난 경우 포함)
 * - `PST0308` 보완 요청 상태가 아님(작성하는 사이 담당자가 판정한 경우)
 */
export const MY_OBJECTION_FINAL_ERROR_CODES: ReadonlySet<string> = new Set([
  "PST0201",
  "PST0202",
  "PST0002",
  "PST0304",
  "PST0308",
])

/**
 * 제출 뒤 목록을 다시 받는다. 실패해도 받는다 — 시간 초과 뒤 서버에는 접수가 끝났거나,
 * 그사이 담당자가 상태를 바꿨을 수 있다. 화면이 옛 상태로 같은 제출을 권하지 않게 한다.
 *
 * 기다리지 않는다. 기다리면 다시 받은 목록이 먼저 그려져 신청 화면이 "이미 신청한 사건"
 * 으로 바뀌고, 접수 완료 화면을 띄울 호출자 콜백이 사라진 화면에서 불리지 않는다.
 */
const refreshMyCases = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries({
    queryKey: getListMyPaymentStopsQueryKey(),
  })
}

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
    }) => {
      const body = new FormData()
      body.append("clause", String(draft.clause))
      body.append("statement", draft.statement)
      body.append("simplifiedRequested", String(draft.simplifiedRequested))
      body.append("litigationPending", String(draft.litigationPending))
      body.append("idCopy", draft.idCopy)
      draft.evidence.forEach((file) => body.append("evidence", file))
      return customFetch<SubmitResponse>(
        `/payment-stops/${caseId}/objections`,
        withIdempotencyKey(
          { method: "POST", body, timeoutMs: UPLOAD_TIMEOUT_MS },
          idempotencyKey,
        ),
      )
    },
    onSettled: () => refreshMyCases(queryClient),
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
    }) => {
      const body = new FormData()
      draft.evidence.forEach((file) => body.append("evidence", file))
      // 빈 메모는 보내지 않는다. 서버는 빈 메모를 없는 것으로 본다
      const note = draft.note.trim()
      if (note !== "") body.append("note", note)
      return customFetch<MyDocumentResponse[]>(
        `/objections/${objectionId}/supplements`,
        withIdempotencyKey(
          { method: "POST", body, timeoutMs: UPLOAD_TIMEOUT_MS },
          idempotencyKey,
        ),
      )
    },
    onSettled: () => refreshMyCases(queryClient),
  })
}
