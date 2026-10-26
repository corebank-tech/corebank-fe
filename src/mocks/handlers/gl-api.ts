import { delay, http } from "msw"
import { requireMockPermission } from "@/mocks/handlers/auth"
import { aggregateTrialBalance } from "@/mocks/gl/aggregate-trial-balance"
import { MOCK_JOURNAL_ENTRIES } from "@/mocks/gl/journal-entries"
import { fail, ok } from "@/mocks/lib/envelope"

const MOCK_LATENCY_MS = 200

/** 서버 `TrialBalanceQueryService.MAX_PERIOD_DAYS`. 목은 서버 값을 따른다. */
const MAX_PERIOD_DAYS = 365

const DAY_MS = 86_400_000

/** `LocalDate` 로 바인딩되는 값인가 — 모양이 맞아도 2026-13-99 같은 날짜는 아니다. */
const isIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const time = Date.parse(`${value}T00:00:00Z`)
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(value)
}

/**
 * 파라미터 바인딩 단계의 검사. 서버는 누락을 `CMN0002`, 날짜 형식 오류를 `CMN0001` 로
 * 돌려준다(`ApiExceptionHandler`). 파라미터 순서대로 첫 오류를 낸다.
 */
const checkDateParam = (value: string) => {
  // 빈 값(`fromDate=`)도 서버에서는 누락이다 — 변환 결과가 null 이 된다.
  if (value === "") {
    return fail("CMN0002", "필수 입력값이 누락되었습니다.", 400)
  }
  if (!isIsoDate(value)) {
    return fail("CMN0001", "입력값이 올바르지 않습니다.", 400)
  }
  return null
}

/**
 * ADM-02 시산표 API(PH-28, 서버 #620) MSW 목.
 *
 * 서버가 하는 검사를 같은 순서·같은 코드로 한다 — 인증(401) → 권한 `GL_READ`(403) →
 * 파라미터 누락 `CMN0002` · 날짜 형식 `CMN0001`(컨트롤러 바인딩) → 기간 역전
 * `CMN0003` → 365일 초과 `CMN0004`(서버 `TrialBalanceQueryService`).
 */
export const glApiHandlers = [
  http.get("*/admin/trial-balance", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)

    const denied = requireMockPermission("GL_READ")
    if (denied) return denied

    const url = new URL(request.url)
    const fromDate = url.searchParams.get("fromDate") ?? ""
    const toDate = url.searchParams.get("toDate") ?? ""
    const bindingError = checkDateParam(fromDate) ?? checkDateParam(toDate)
    if (bindingError) return bindingError

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
