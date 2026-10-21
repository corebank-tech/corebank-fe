import { delay, http } from "msw"
import type { LedgerReconciliationMismatchResponse } from "@/shared/api/generated"
import { readMockAuthority } from "@/mocks/handlers/admin"
import { readSignedInMemberId, unauthorized } from "@/mocks/handlers/auth"
import { fail, ok } from "@/mocks/lib/envelope"
import { daysAgo } from "@/shared/lib/mock-date"

const MOCK_LATENCY_MS = 200

/** 서버 `AdminLedgerReconciliationController.ALLOWED_PAGE_SIZES`. */
const ALLOWED_PAGE_SIZES = [5, 10, 20, 30, 50]

const mismatch = (
  businessDate: string,
  accountId: number,
  ledgerBalance: number,
  accountBalance: number,
): LedgerReconciliationMismatchResponse => ({
  businessDate,
  accountId,
  ledgerBalance,
  accountBalance,
  difference: ledgerBalance - accountBalance,
  detectedAt: `${businessDate}T23:31:05+09:00`,
})

const LATEST = daysAgo(1)
const EARLIER = daysAgo(8)

/**
 * 영업일 두 개. 최근 영업일은 12건이라 10건 고정 페이지(POL-A06)에서 2쪽이 된다.
 * 차액은 양수(잔액 부족)·음수(잔액 초과)를 섞는다 — 한쪽만 있으면 방향 표기
 * (REQ-ADM-041)의 다른 쪽 분기를 볼 수 없다.
 */
const MOCK_MISMATCHES: LedgerReconciliationMismatchResponse[] = [
  ...Array.from({ length: 12 }, (_, i) =>
    mismatch(
      LATEST,
      1001 + i,
      1_000_000 + i * 10_000,
      i % 3 === 0 ? 1_100_000 + i * 10_000 : 900_000 + i * 10_000,
    ),
  ),
  mismatch(EARLIER, 1003, 500_000, 450_000),
]

/**
 * ADM-04 대사 불일치 목록 API(PH-38, 서버 #613) MSW 목.
 *
 * 서버와 같이 영업일을 빼면 가장 최근에 불일치가 기록된 영업일을 고르고, 계좌 ID
 * 오름차순으로 돌려준다. 페이지는 0부터다.
 */
export const ledgerReconciliationApiHandlers = [
  http.get("*/admin/ledger-reconciliation/mismatches", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)

    const memberId = readSignedInMemberId()
    if (memberId == null) return unauthorized()
    if (!readMockAuthority(memberId).permissions.includes("AUDIT_READ")) {
      return fail("CMN0102", "해당 자원에 접근할 권한이 없습니다.", 403)
    }

    const url = new URL(request.url)
    const page = Number(url.searchParams.get("page") ?? 0)
    const size = Number(url.searchParams.get("size") ?? 10)
    if (!ALLOWED_PAGE_SIZES.includes(size)) {
      return fail("CMN0005", "지원하지 않는 페이지 크기입니다.", 400)
    }

    const requested = url.searchParams.get("businessDate")
    const target =
      requested ??
      MOCK_MISMATCHES.map((m) => m.businessDate ?? "")
        .sort()
        .at(-1)
    const onDate = MOCK_MISMATCHES.filter(
      (m) => m.businessDate === target,
    ).sort((a, b) => (a.accountId ?? 0) - (b.accountId ?? 0))

    return ok({
      page,
      size,
      totalCount: onDate.length,
      totalPages: Math.ceil(onDate.length / size),
      items: onDate.slice(page * size, (page + 1) * size),
    })
  }),
]
