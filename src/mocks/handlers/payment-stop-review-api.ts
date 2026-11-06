import { delay, http, HttpResponse } from "msw"
import type {
  DecisionResponse,
  ExternalCheckRequest,
  ReturnRequest,
  SupplementRequest,
} from "@/shared/api/generated"
import { addBusinessDays } from "@/entities/payment-stop"
import { requireMockPermission } from "@/mocks/handlers/auth"
import {
  CASE_STATUS_AFTER,
  allowedResults,
  currentAdminId,
  disputedTotal,
  noticeOf,
  objectionNotFound,
  readState,
  requireIdempotencyKey,
  toSummary,
  writeState,
  type MockObjection,
} from "@/mocks/handlers/payment-stop-api"
import { latestRunSummary } from "@/mocks/handlers/payment-stop-agent-api"
import {
  MINIMAL_PDF,
  renderDocumentSvg,
  renderIdCopySvg,
} from "@/mocks/handlers/payment-stop-review-fixtures"
import { fail, ok } from "@/mocks/lib/envelope"
import { nextSequence, toLocalDateTime } from "@/mocks/lib/mock-store"
import { getToday } from "@/shared/config/clock"

/**
 * 이의제기 심사 운영 API(계약 v2 §3) MSW 목. 상태는 `payment-stop-api.ts` 의 저장소를 쓴다.
 *
 * 기한은 주말만 빼고 센다(서버는 공휴일도 뺀다). 외부 확인은 모의라 요청 즉시 지정한 회신으로
 * 끝나고, 가담 의심이나 서류 위조 회신은 수용과 일부 지급정지를 닫는다.
 *
 * 목록도 여기서 준다. 목록 요약에 AI 분석 최근 상태를 싣는데(N+1 제거), 그 상태는 AI 분석
 * 목이 계산하고 그 목은 `payment-stop-api.ts` 를 읽으므로 순환을 피해 이 파일에 둔다.
 */

const MOCK_LATENCY_MS = 150
const ACCESS_REASONS = ["CUSTOMER_REQUEST", "INCIDENT", "AUDIT", "OPERATION"]
const MAX_TEXT_LENGTH = 500
const MAX_MISSING_DOCUMENTS = 20
const SUPPLEMENT_DAYS: Record<number, number> = { 1: 5, 2: 3 }

const invalidState = () =>
  fail("PST0308", "지금 상태에서 할 수 없는 요청입니다.", 409)

const missingInput = () => fail("CMN0002", "필수 입력값이 누락되었습니다.", 400)

const withObjection = (
  params: Record<string, unknown>,
  run: (objection: MockObjection, save: () => void) => Response,
) => {
  const state = readState()
  const objection = state.objections.find(
    (item) => item.objectionId === Number(params.objectionId),
  )
  if (!objection) return objectionNotFound()
  return run(objection, () => writeState(state))
}

/** 승인으로 확정될 때 남기는 통지(D30). 지급정지가 끝나면 종료 통지를 더한다. */
const approvalNotices = (
  objection: MockObjection,
  result: string,
  now: string,
) => {
  const kind = result === "ACCEPTED" ? "DECISION_ACCEPTED" : "DECISION_PARTIAL"
  for (const target of ["VICTIM", "FSS"]) {
    objection.notices.push(noticeOf(objection, target, kind, "DOCUMENT", now))
  }
  if (CASE_STATUS_AFTER[result] === "RELEASED") {
    for (const target of ["HOLDER", "VICTIM", "RELATED_BANK"]) {
      objection.notices.push(
        noticeOf(objection, target, "STOP_TERMINATED", "DOCUMENT", now),
      )
    }
  }
}

export const paymentStopReviewApiHandlers = [
  http.get("*/admin/objections", async () => {
    await delay(MOCK_LATENCY_MS)
    const denied = requireMockPermission("PAYMENT_STOP_READ")
    if (denied) return denied

    const { objections } = readState()
    const recent = [...objections].sort((a, b) =>
      b.receivedAt.localeCompare(a.receivedAt),
    )
    return ok(
      recent.map((objection) => {
        const run = latestRunSummary(objection)
        return {
          ...toSummary(objection),
          latestRunStatus: run.status,
          latestRunLastStepTitle: run.lastStepTitle,
        }
      }),
    )
  }),

  http.post(
    "*/admin/objections/:objectionId/completeness",
    async ({ params, request }) => {
      await delay(MOCK_LATENCY_MS)
      const denied =
        requireMockPermission("PAYMENT_STOP_WRITE") ??
        requireIdempotencyKey(request)
      if (denied) return denied
      return withObjection(params, (objection, save) => {
        if (
          objection.objectionStatus !== "RECEIVED" &&
          objection.objectionStatus !== "SUPPLEMENT_SUBMITTED"
        ) {
          return invalidState()
        }
        objection.objectionStatus = "UNDER_REVIEW"
        objection.reviewDeadline = addBusinessDays(getToday(), 5)
        objection.supplementDue = null
        save()
        return ok({ reviewDeadline: objection.reviewDeadline })
      })
    },
  ),

  http.post(
    "*/admin/objections/:objectionId/supplement-requests",
    async ({ params, request }) => {
      await delay(MOCK_LATENCY_MS)
      const denied =
        requireMockPermission("PAYMENT_STOP_WRITE") ??
        requireIdempotencyKey(request)
      if (denied) return denied
      const body = (await request.json()) as SupplementRequest
      if (
        !body.reason?.trim() ||
        body.reason.length > MAX_TEXT_LENGTH ||
        body.missingDocuments.length > MAX_MISSING_DOCUMENTS
      ) {
        return missingInput()
      }
      return withObjection(params, (objection, save) => {
        if (
          objection.objectionStatus === "DECIDED" ||
          objection.objectionStatus === "PENDING_APPROVAL" ||
          objection.objectionStatus === "SUPPLEMENT_REQUESTED"
        ) {
          return invalidState()
        }
        const round = objection.supplementRound + 1
        if (round > 2) {
          return fail("PST0006", "보완 요청은 2회까지 할 수 있습니다.", 400)
        }
        const now = toLocalDateTime(new Date())
        objection.supplementRound = round
        objection.supplementDue = addBusinessDays(
          getToday(),
          SUPPLEMENT_DAYS[round],
        )
        objection.objectionStatus = "SUPPLEMENT_REQUESTED"
        objection.notices.push(
          noticeOf(
            objection,
            "HOLDER",
            "SUPPLEMENT_REQUEST",
            "SMS",
            now,
            [body.reason.trim(), ...body.missingDocuments].join(", "),
          ),
        )
        save()
        return ok({ round, supplementDue: objection.supplementDue })
      })
    },
  ),

  http.post(
    "*/admin/objections/:objectionId/review-sessions",
    async ({ params }) => {
      await delay(MOCK_LATENCY_MS)
      const denied = requireMockPermission("PAYMENT_STOP_READ")
      if (denied) return denied
      return withObjection(params, () =>
        ok({
          sessionId: nextSequence("payment-stop-review-session"),
          startedAt: toLocalDateTime(new Date()),
        }),
      )
    },
  ),

  http.post(
    "*/admin/objections/:objectionId/decisions/:decisionId/approve",
    async ({ params, request }) => {
      await delay(MOCK_LATENCY_MS)
      const denied =
        requireMockPermission("PAYMENT_STOP_APPROVE") ??
        requireIdempotencyKey(request)
      if (denied) return denied
      return withObjection(params, (objection, save) => {
        const pending = objection.pendingDecision
        if (!pending || pending.decisionId !== Number(params.decisionId)) {
          return fail("PST0204", "승인할 판정이 없습니다.", 404)
        }
        const approver = currentAdminId()
        if (pending.decidedBy === approver) {
          return fail(
            "PST0309",
            "판정을 작성한 관리자는 승인할 수 없습니다.",
            409,
          )
        }
        // 확정 직전에 해제 요건을 다시 계산한다(D11).
        if (!allowedResults(objection)[pending.result as "ACCEPTED"]) {
          return fail(
            "PST0301",
            "해제 요건을 충족하지 않아 이 판정을 확정할 수 없습니다.",
            409,
          )
        }
        const now = toLocalDateTime(new Date())
        const total = disputedTotal(objection)
        const confirmed: DecisionResponse = {
          ...pending,
          status: "CONFIRMED",
          appliedHoldAmount: pending.result === "PARTIAL" ? total : undefined,
          approvedBy: approver,
          approvedAt: now,
        }
        objection.decision = confirmed
        objection.pendingDecision = null
        objection.objectionStatus = "DECIDED"
        objection.caseStatus = CASE_STATUS_AFTER[pending.result ?? ""]
        approvalNotices(objection, pending.result ?? "", now)
        save()
        return ok(confirmed)
      })
    },
  ),

  http.post(
    "*/admin/objections/:objectionId/decisions/:decisionId/return",
    async ({ params, request }) => {
      await delay(MOCK_LATENCY_MS)
      const denied =
        requireMockPermission("PAYMENT_STOP_APPROVE") ??
        requireIdempotencyKey(request)
      if (denied) return denied
      const body = (await request.json()) as ReturnRequest
      if (!body.reason?.trim() || body.reason.length > MAX_TEXT_LENGTH) {
        return missingInput()
      }
      return withObjection(params, (objection, save) => {
        const pending = objection.pendingDecision
        if (!pending || pending.decisionId !== Number(params.decisionId)) {
          return fail("PST0204", "승인할 판정이 없습니다.", 404)
        }
        const returned: DecisionResponse = {
          ...pending,
          status: "RETURNED",
          returnReason: body.reason.trim(),
        }
        objection.pendingDecision = null
        objection.objectionStatus = "UNDER_REVIEW"
        save()
        return ok(returned)
      })
    },
  ),

  http.get(
    "*/admin/objections/:objectionId/external-checks",
    async ({ params }) => {
      await delay(MOCK_LATENCY_MS)
      const denied = requireMockPermission("PAYMENT_STOP_READ")
      if (denied) return denied
      return withObjection(params, (objection) => ok(objection.externalChecks))
    },
  ),

  http.post(
    "*/admin/objections/:objectionId/external-checks",
    async ({ params, request }) => {
      await delay(MOCK_LATENCY_MS)
      const denied =
        requireMockPermission("PAYMENT_STOP_WRITE") ??
        requireIdempotencyKey(request)
      if (denied) return denied
      const body = (await request.json()) as ExternalCheckRequest
      return withObjection(params, (objection, save) => {
        // 같은 기관에 다시 요청하면 기존 행을 돌려준다(멱등).
        const existing = objection.externalChecks.find(
          (check) => check.agency === body.agency,
        )
        if (existing) return ok(existing)
        const now = toLocalDateTime(new Date())
        const check = {
          checkId: objection.objectionId * 100 + nextSequence("external-check"),
          agency: body.agency,
          status: "REPLIED",
          reply: body.mockReply,
          requestedAt: now,
          repliedAt: now,
        }
        objection.externalChecks.push(check)
        save()
        return ok(check)
      })
    },
  ),

  http.get("*/admin/objections/:objectionId/notices", async ({ params }) => {
    await delay(MOCK_LATENCY_MS)
    const denied = requireMockPermission("PAYMENT_STOP_READ")
    if (denied) return denied
    return withObjection(params, (objection) => ok(objection.notices))
  }),

  http.get("*/admin/objections/:objectionId/documents", async ({ params }) => {
    await delay(MOCK_LATENCY_MS)
    const denied = requireMockPermission("PAYMENT_STOP_READ")
    if (denied) return denied
    return withObjection(params, (objection) =>
      ok(
        objection.documents.map((document) => ({
          documentId: document.documentId,
          kind: document.kind,
          fileName: document.fileName,
          contentType: document.contentType,
          size: document.size,
          sha256: document.sha256,
          round: document.round,
          uploadedAt: document.uploadedAt,
          ocrStatus: document.ocrStatus ?? undefined,
        })),
      ),
    )
  }),

  http.get(
    "*/admin/objections/:objectionId/documents/:documentId/content",
    async ({ params, request }) => {
      await delay(MOCK_LATENCY_MS)
      const denied = requireMockPermission("PAYMENT_STOP_READ")
      if (denied) return denied
      if (
        !ACCESS_REASONS.includes(request.headers.get("X-Access-Reason") ?? "")
      ) {
        return fail("CMN0007", "조회 사유가 없거나 올바르지 않습니다.", 400)
      }
      return withObjection(params, (objection) => {
        const document = objection.documents.find(
          (item) => item.documentId === Number(params.documentId),
        )
        if (!document) return fail("PST0205", "문서를 찾을 수 없습니다.", 404)
        if (document.contentType === "application/pdf") {
          return new HttpResponse(MINIMAL_PDF, {
            headers: { "Content-Type": "application/pdf" },
          })
        }
        const page = document.pages?.[0]
        const svg =
          document.kind === "ID_COPY" || !page
            ? renderIdCopySvg()
            : renderDocumentSvg(page)
        return new HttpResponse(svg, {
          headers: { "Content-Type": "image/svg+xml" },
        })
      })
    },
  ),

  http.get(
    "*/admin/objections/:objectionId/documents/:documentId/ocr",
    async ({ params }) => {
      await delay(MOCK_LATENCY_MS)
      const denied = requireMockPermission("PAYMENT_STOP_READ")
      if (denied) return denied
      return withObjection(params, (objection) => {
        const document = objection.documents.find(
          (item) => item.documentId === Number(params.documentId),
        )
        if (!document) return fail("PST0205", "문서를 찾을 수 없습니다.", 404)
        return ok({
          documentId: document.documentId,
          pages: document.pages ?? [],
        })
      })
    },
  ),

  http.get("*/admin/objections/:objectionId/ledger", async ({ params }) => {
    await delay(MOCK_LATENCY_MS)
    const denied = requireMockPermission("PAYMENT_STOP_READ")
    if (denied) return denied
    return withObjection(params, (objection) => ok(objection.ledger))
  }),
]
