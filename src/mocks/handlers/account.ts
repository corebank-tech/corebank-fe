import { delay, http, HttpResponse } from "msw"
import { MOCK_OVERVIEW_ACCOUNTS } from "@/entities/account"
import { fail, ok } from "@/mocks/lib/envelope"

const MOCK_LATENCY_MS = 300

/**
 * customFetch 계약을 증명하기 위한 예시 핸들러 세트.
 * 21개 mock 모듈 전체를 엔드포인트로 옮기지 않는다 — openapi.yaml 확정 후
 * orval 이 스펙에서 MSW 핸들러를 직접 생성하므로 지금 하는 추측 작업은 버려진다.
 */
export const accountHandlers = [
  // 정상: {code, message, data} 봉투 확인 (REQ-CMN-007)
  http.get("*/api/accounts", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)
    const group = new URL(request.url).searchParams.get("group")
    const accounts = group
      ? MOCK_OVERVIEW_ACCOUNTS.filter((account) => account.group === group)
      : MOCK_OVERVIEW_ACCOUNTS
    return ok({ accounts, totalCount: accounts.length })
  }),

  // 업무오류: 서버 code/message 를 그대로 전달하는 경로 확인 (REQ-CMN-008)
  http.get("*/api/accounts/:accountNo", async ({ params }) => {
    await delay(MOCK_LATENCY_MS)
    const account = MOCK_OVERVIEW_ACCOUNTS.find(
      (item) => item.accountNo === params.accountNo,
    )
    if (!account) return fail("ACCT0001", "존재하지 않는 계좌입니다.", 404)
    return ok(account)
  }),

  // Idempotency-Key 수신 확인 (REQ-CMN-014) + 세션 만료 경로 (POL-001)
  http.post("*/api/accounts/:accountNo/alias", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)
    const idempotencyKey = request.headers.get("Idempotency-Key")
    if (!idempotencyKey) return fail("CMN4000", "멱등키가 필요합니다.", 400)
    return ok({ updated: true })
  }),

  http.get("*/api/session/probe", () =>
    HttpResponse.json(
      { code: "AUTH4010", message: "세션이 만료되었습니다.", data: null },
      { status: 401 },
    ),
  ),
]
