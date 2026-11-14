import { describe, expect, it } from "vitest"
import { createQueryClient } from "@/shared/api/query-client"

/**
 * 사용자 조작 없는 재조회는 서버 세션을 갱신해 POL-001 의 10분 자동 로그아웃을 무력화한다.
 * 플래그 하나만 켜도 구멍이 다시 열리고 화면 테스트로는 드러나지 않아 여기서 고정한다.
 */
describe("QueryClient 기본값", () => {
  const queries = () => createQueryClient().getDefaultOptions().queries

  it.each([
    ["refetchOnWindowFocus"],
    ["refetchInterval"],
    ["refetchOnReconnect"],
  ] as const)("%s 로 백그라운드 재조회를 하지 않는다 (POL-001)", (flag) => {
    expect(queries()?.[flag]).toBe(false)
  })

  it("뮤테이션을 자동 재시도하지 않는다 (REQ-CMN-014)", () => {
    // 재시도마다 새 Idempotency-Key 가 나가면 서버가 같은 요청을 별개 거래로 처리한다.
    expect(createQueryClient().getDefaultOptions().mutations?.retry).toBe(0)
  })
})
