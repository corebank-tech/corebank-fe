import { delay, http } from "msw"
import { readMockAuthority } from "@/mocks/handlers/admin"
import { readSignedInMemberId, unauthorized } from "@/mocks/handlers/auth"
import { aggregateTrialBalance } from "@/mocks/gl/aggregate-trial-balance"
import { MOCK_JOURNAL_ENTRIES } from "@/mocks/gl/journal-entries"
import { fail, ok } from "@/mocks/lib/envelope"

const MOCK_LATENCY_MS = 200

/** 서버 `TrialBalanceQueryService.MAX_PERIOD_DAYS`. FE `QUERY_MAX_RANGE_DAYS` 와 같다. */
const MAX_PERIOD_DAYS = 365

const DAY_MS = 86_400_000

/**
 * ADM-02 시산표 API(PH-28, 서버 #620) MSW 목.
 *
 * 서버가 하는 검사를 같은 순서·같은 코드로 한다 — 인증(401) → 권한 `GL_READ`(403) →
 * 기간 역전 `CMN0003` → 365일 초과 `CMN0004`(서버 `TrialBalanceQueryService`).
 */
export const glApiHandlers = [
  http.get("*/admin/trial-balance", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)

    const memberId = readSignedInMemberId()
    if (memberId == null) return unauthorized()
    if (!readMockAuthority(memberId).permissions.includes("GL_READ")) {
      return fail("CMN0102", "해당 자원에 접근할 권한이 없습니다.", 403)
    }

    const url = new URL(request.url)
    const fromDate = url.searchParams.get("fromDate") ?? ""
    const toDate = url.searchParams.get("toDate") ?? ""
    if (fromDate > toDate) {
      return fail("CMN0003", "조회 시작일이 종료일보다 늦습니다.", 400)
    }
    const days = (Date.parse(toDate) - Date.parse(fromDate)) / DAY_MS
    if (days > MAX_PERIOD_DAYS) {
      return fail("CMN0004", "조회기간이 최대 1년을 초과했습니다.", 400)
    }

    return ok(
      aggregateTrialBalance(MOCK_JOURNAL_ENTRIES, {
        start: fromDate,
        end: toDate,
      }),
    )
  }),
]
