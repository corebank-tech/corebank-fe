import { delay, http } from "msw"
import {
  MAX_EVIDENCE_COUNT,
  MAX_FILE_BYTES,
  MAX_FILE_COUNT,
  MAX_TOTAL_BYTES,
  readFileKind,
} from "@/entities/payment-stop"
import type { MyCaseResponse, MyDocumentResponse } from "@/shared/api/generated"
import { readSignedInMemberId, unauthorized } from "@/mocks/handlers/auth"
import { fail, ok } from "@/mocks/lib/envelope"
import { readStore, toLocalDateTime, writeStore } from "@/mocks/lib/mock-store"
import { addDays } from "@/shared/lib/date"
import { getToday } from "@/shared/config/clock"

/**
 * 고객 비대면 이의제기 API(이의제기 2차 계약 §4, §5) MSW 목.
 *
 * 화면 흐름(목록 → 신청 → 접수 완료, 보완 제출)을 서버 없이 돌리기 위한 것이다.
 * 관리자 목(`payment-stop-api.ts`)과 저장소를 나눈다. 고객이 낸 신청이 관리자 목록에
 * 나타나지는 않는다.
 *
 * 사건은 로그인 고객별로 둔다. 홍길동(`honggildong`)에게만 사건 5건(신청 전, 보완 요청,
 * 심사 중, 수용 확정, 불수용 확정)이 있고 다른 고객은 빈 목록이다. 상태는
 * sessionStorage 에 둔다.
 *
 * 거부 순서는 서버와 같다. 신청은 입력 검증, 파일 개수와 크기(`PST0007`), 멱등키,
 * 본인 사건(`PST0201`), 신분증 사본(`PST0003`), 파일 형식과 누적 한도(`PST0007`),
 * 이미 신청(`PST0304`), 기한(`PST0002`), 사유(`PST0003`) 순서다
 * (`CustomerObjectionController`, `CustomerObjectionService`, `ObjectionService`,
 * `Objection.receive`). 개수 10개와 합계 30MB 는 이미 낸 서류까지 합쳐 센다.
 */

const MOCK_LATENCY_MS = 300
// 저장 모양이 바뀌어 키를 올린다. 옛 모양을 읽으면 멱등 재생이 깨진다
const STORE_KEY = "payment-stop:my-cases:v2"

type MockMyCase = Required<
  Pick<
    MyCaseResponse,
    | "caseId"
    | "accountNumberMasked"
    | "caseStatus"
    | "disputedTotal"
    | "objectionDeadline"
  >
> & {
  memberId: string
  objectionId: number | null
  objectionStatus: string | null
  supplementDue: string | null
  missingDocuments: string[]
  decisionResult: string | null
  documents: MyDocumentResponse[]
}

type MockReply = { fingerprint: string; reply: unknown }

type MockState = {
  cases: MockMyCase[]
  /** 멱등키 → 처음 처리한 요청 지문과 결과. 서버처럼 성공만 남긴다 */
  replies: Record<string, MockReply>
  nextDocumentId: number
}

const MB = 1024 * 1024

/** 시드 서류. 내용이 없어 크기만 둔다 */
const seedDocument = (
  documentId: number,
  kind: "ID_COPY" | "EVIDENCE",
  fileName: string,
  size: number,
): MyDocumentResponse => ({
  documentId,
  kind,
  fileName,
  contentType: fileName.endsWith(".pdf") ? "application/pdf" : "image/png",
  size,
  round: 0,
  uploadedAt: `${addDays(getToday(), -6)}T10:00:00`,
})

const seed = (): MockState => ({
  cases: [
    {
      memberId: "honggildong",
      caseId: 101,
      accountNumberMasked: "110-632-***336",
      caseStatus: "STOPPED",
      disputedTotal: 1_200_000,
      objectionDeadline: addDays(getToday(), 40),
      objectionId: null,
      objectionStatus: null,
      supplementDue: null,
      missingDocuments: [],
      decisionResult: null,
      documents: [],
    },
    {
      memberId: "honggildong",
      caseId: 102,
      accountNumberMasked: "110-632-***336",
      caseStatus: "STOPPED",
      disputedTotal: 350_000,
      objectionDeadline: addDays(getToday(), 25),
      objectionId: 201,
      objectionStatus: "SUPPLEMENT_REQUESTED",
      supplementDue: addDays(getToday(), 4),
      missingDocuments: [
        "거래상대방과 주고받은 대화 내역",
        "물품 거래 계약서 또는 거래명세서",
      ],
      decisionResult: null,
      // 신청 때 낸 서류. 보완 제출의 누적 한도에 들어간다
      documents: [
        seedDocument(9001, "ID_COPY", "신분증.png", 1 * MB),
        seedDocument(9002, "EVIDENCE", "입금내역.pdf", 2 * MB),
      ],
    },
    {
      memberId: "honggildong",
      caseId: 103,
      accountNumberMasked: "352-0412-****-73",
      caseStatus: "STOPPED",
      disputedTotal: 2_800_000,
      objectionDeadline: addDays(getToday(), 12),
      objectionId: 202,
      objectionStatus: "UNDER_REVIEW",
      supplementDue: null,
      missingDocuments: [],
      decisionResult: null,
      documents: [],
    },
    {
      // 번호를 200 아래로 둔다. 새 신청 번호(203)가 시드와 겹치지 않게 한다
      memberId: "honggildong",
      caseId: 104,
      accountNumberMasked: "110-632-***512",
      caseStatus: "RELEASED",
      disputedTotal: 480_000,
      objectionDeadline: addDays(getToday(), -10),
      objectionId: 198,
      objectionStatus: "DECIDED",
      supplementDue: null,
      missingDocuments: [],
      decisionResult: "ACCEPTED",
      documents: [],
    },
    {
      memberId: "honggildong",
      caseId: 105,
      accountNumberMasked: "352-0412-****-88",
      caseStatus: "STOPPED",
      disputedTotal: 900_000,
      objectionDeadline: addDays(getToday(), -3),
      objectionId: 199,
      objectionStatus: "DECIDED",
      supplementDue: null,
      missingDocuments: [],
      decisionResult: "REJECTED",
      documents: [],
    },
  ],
  replies: {},
  nextDocumentId: 1,
})

/**
 * 처음 읽을 때 시드를 저장해 둔다. 저장하지 않으면 날짜가 읽을 때마다 새로 계산되고,
 * 시연 중 저장소를 바꿔 다른 장면을 만들 수도 없다.
 */
const readState = (): MockState => {
  const stored = readStore<MockState | null>(STORE_KEY, null)
  if (stored) return stored
  const fresh = seed()
  writeStore(STORE_KEY, fresh)
  return fresh
}
const writeState = (state: MockState) => writeStore(STORE_KEY, state)

const toResponse = (item: MockMyCase): MyCaseResponse => ({
  caseId: item.caseId,
  accountNumberMasked: item.accountNumberMasked,
  caseStatus: item.caseStatus,
  disputedTotal: item.disputedTotal,
  objectionDeadline: item.objectionDeadline,
  objectionId: item.objectionId ?? undefined,
  objectionStatus: item.objectionStatus ?? undefined,
  supplementDue: item.supplementDue ?? undefined,
  missingDocuments: item.missingDocuments,
  decisionResult: item.decisionResult ?? undefined,
})

const fileViolation = () =>
  fail("PST0007", "파일 형식, 크기, 개수가 허용 범위를 벗어났습니다.", 400)

const requirementsMissing = () =>
  fail("PST0003", "신분증 사본 확인과 이의제기 사유가 필요합니다.", 400)

const caseNotFound = () =>
  fail("PST0201", "지급정지 사건을 찾을 수 없습니다.", 404)

const invalidInput = () => fail("CMN0001", "입력값이 올바르지 않습니다.", 400)

const keyReused = () =>
  fail("CMN0302", "동일한 멱등키가 다른 요청에 사용되었습니다.", 409)

const asFiles = (values: FormDataEntryValue[]): File[] | null =>
  values.every((value) => typeof value !== "string") ? (values as File[]) : null

/** 서버 `UploadFiles.of` 와 같은 앞단 검사. 개수 범위와 파일 하나 크기만 본다 */
const withinUploadLimits = (files: File[], min: number, max: number) =>
  files.length >= min &&
  files.length <= max &&
  files.every((file) => file.size <= MAX_FILE_BYTES)

/**
 * 서버 `DocumentPolicy.validate` 와 같은 검사. 이미 있는 서류와 합쳐 개수와 합계를 보고,
 * 파일마다 빈 파일 여부와 매직 바이트를 본다. 통과하면 `true`
 */
const filesAcceptable = async (
  files: File[],
  existing: MyDocumentResponse[],
): Promise<boolean> => {
  if (files.length === 0 || existing.length + files.length > MAX_FILE_COUNT) {
    return false
  }
  if (files.some((file) => file.size === 0 || file.size > MAX_FILE_BYTES)) {
    return false
  }
  const existingBytes = existing.reduce((sum, doc) => sum + (doc.size ?? 0), 0)
  const total = files.reduce((sum, file) => sum + file.size, existingBytes)
  if (total > MAX_TOTAL_BYTES) return false
  const kinds = await Promise.all(files.map(readFileKind))
  return kinds.every((kind) => kind != null)
}

/** 멱등 지문. 서버는 파일 해시를 넣지만 목은 이름과 크기로 대신한다 */
const fingerprintOf = (target: string, fields: unknown) =>
  JSON.stringify({ target, fields })

const fileMarks = (files: File[]) => files.map((file) => [file.name, file.size])

const toDocuments = (
  state: MockState,
  files: { file: File; kind: "ID_COPY" | "EVIDENCE" }[],
  round: number,
): MyDocumentResponse[] =>
  files.map(({ file, kind }) => ({
    documentId: state.nextDocumentId++,
    kind,
    fileName: file.name,
    contentType: file.type,
    size: file.size,
    round,
    uploadedAt: toLocalDateTime(new Date()),
  }))

export const paymentStopCustomerApiHandlers = [
  http.get("*/payment-stops/my", async () => {
    await delay(MOCK_LATENCY_MS)
    const memberId = readSignedInMemberId()
    if (memberId == null) return unauthorized()
    const mine = readState().cases.filter((item) => item.memberId === memberId)
    return ok(mine.map(toResponse))
  }),

  http.post(
    "*/payment-stops/:caseId/objections",
    async ({ params, request }) => {
      await delay(MOCK_LATENCY_MS)
      const memberId = readSignedInMemberId()
      if (memberId == null) return unauthorized()
      const key = request.headers.get("Idempotency-Key")
      if (!key) return fail("CMN0002", "필수 입력값이 누락되었습니다.", 400)

      // 입력 검증(서버 `@Validated`)이 먼저다
      const form = await request.formData()
      const clause = Number(form.get("clause"))
      const statement = String(form.get("statement") ?? "")
      if (![1, 2, 3].includes(clause) || statement.length > 4000) {
        return invalidInput()
      }
      const idCopies = asFiles(form.getAll("idCopy"))
      const evidence = asFiles(form.getAll("evidence"))
      if (!idCopies || !evidence || idCopies.length > 1) return invalidInput()

      // 컨트롤러가 파일을 읽으며 개수와 크기를 본다
      if (!withinUploadLimits([...idCopies, ...evidence], 0, 10)) {
        return fileViolation()
      }
      if (!withinUploadLimits(evidence, 0, MAX_EVIDENCE_COUNT)) {
        return fileViolation()
      }

      const state = readState()
      const fingerprint = fingerprintOf(`case:${String(params.caseId)}`, {
        clause,
        statement,
        simplifiedRequested: form.get("simplifiedRequested"),
        litigationPending: form.get("litigationPending"),
        idCopy: fileMarks(idCopies),
        evidence: fileMarks(evidence),
      })
      const replayed = state.replies[key]
      if (replayed) {
        return replayed.fingerprint === fingerprint
          ? ok(replayed.reply)
          : keyReused()
      }

      // 본인 사건이 아니면 사건이 없는 것과 같은 오류다(존재 여부 비노출)
      const target = state.cases.find(
        (item) =>
          item.caseId === Number(params.caseId) && item.memberId === memberId,
      )
      if (!target) return caseNotFound()
      if (idCopies.length === 0) return requirementsMissing()
      if (!(await filesAcceptable([...idCopies, ...evidence], []))) {
        return fileViolation()
      }
      // 해제된 사건도 존재 여부를 가리려고 같은 오류다
      if (target.caseStatus === "RELEASED") return caseNotFound()
      if (target.objectionId != null) {
        return fail("PST0304", "이미 이의제기가 접수된 사건입니다.", 409)
      }
      if (target.objectionDeadline < getToday()) {
        return fail("PST0002", "이의제기 신청 기한이 지났습니다.", 400)
      }
      if (statement.trim() === "") return requirementsMissing()

      const objectionId =
        Math.max(200, ...state.cases.map((item) => item.objectionId ?? 0)) + 1
      target.objectionId = objectionId
      target.objectionStatus = "RECEIVED"
      target.documents = toDocuments(
        state,
        [
          ...idCopies.map((file) => ({ file, kind: "ID_COPY" as const })),
          ...evidence.map((file) => ({ file, kind: "EVIDENCE" as const })),
        ],
        0,
      )
      const reply = { objectionId }
      state.replies[key] = { fingerprint, reply }
      writeState(state)
      return ok(reply)
    },
  ),

  http.post(
    "*/objections/:objectionId/supplements",
    async ({ params, request }) => {
      await delay(MOCK_LATENCY_MS)
      const memberId = readSignedInMemberId()
      if (memberId == null) return unauthorized()
      const key = request.headers.get("Idempotency-Key")
      if (!key) return fail("CMN0002", "필수 입력값이 누락되었습니다.", 400)

      const form = await request.formData()
      const note = String(form.get("note") ?? "")
      if (note.length > 1000) return invalidInput()
      const evidence = asFiles(form.getAll("evidence"))
      if (!evidence) return invalidInput()
      if (!withinUploadLimits(evidence, 1, MAX_EVIDENCE_COUNT)) {
        return fileViolation()
      }

      const state = readState()
      const fingerprint = fingerprintOf(
        `objection:${String(params.objectionId)}`,
        { note, evidence: fileMarks(evidence) },
      )
      const replayed = state.replies[key]
      if (replayed) {
        return replayed.fingerprint === fingerprint
          ? ok(replayed.reply)
          : keyReused()
      }

      const target = state.cases.find(
        (item) =>
          item.objectionId === Number(params.objectionId) &&
          item.memberId === memberId,
      )
      if (!target) {
        return fail("PST0202", "이의제기를 찾을 수 없습니다.", 404)
      }
      if (target.objectionStatus !== "SUPPLEMENT_REQUESTED") {
        return fail("PST0308", "지금 상태에서 할 수 없는 요청입니다.", 409)
      }
      // 이미 낸 서류(신분증 사본 포함)와 합쳐 10개, 30MB 를 본다
      if (!(await filesAcceptable(evidence, target.documents))) {
        return fileViolation()
      }

      const round =
        Math.max(0, ...target.documents.map((doc) => doc.round ?? 0)) + 1
      const uploaded = toDocuments(
        state,
        evidence.map((file) => ({ file, kind: "EVIDENCE" as const })),
        round,
      )
      target.documents.push(...uploaded)
      target.objectionStatus = "SUPPLEMENT_SUBMITTED"
      target.supplementDue = null
      target.missingDocuments = []
      state.replies[key] = { fingerprint, reply: uploaded }
      writeState(state)
      return ok(uploaded)
    },
  ),
]
