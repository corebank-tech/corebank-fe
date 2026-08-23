import { customFetch } from "@/shared/api/custom-fetch"

/**
 * POST /auth/logout 은 SecurityConfig 의 로그아웃 필터라 @RestController 가 아니고,
 * springdoc 이 OpenAPI 스펙에 넣지 않는다. 그래서 생성 훅이 없어 직접 부른다.
 * CSRF 헤더(X-XSRF-TOKEN)는 customFetch 가 붙인다 — 없으면 403 CMN0102 로 거부된다.
 */
const LOGOUT_URL = "/auth/logout"

/**
 * 실패해도 던지지 않는다.
 *
 * 서버는 세션이 이미 없으면 401 CMN0101 을 주면서도 JSESSIONID·XSRF-TOKEN 쿠키는
 * 지운다(실측). 즉 이 호출의 오류는 "로그아웃이 안 됐다"는 뜻이 아니고, 호출자가
 * 할 수 있는 조치도 없다. 공용 PC 를 고려해 어떤 결과든 클라이언트 상태는 정리한다.
 */
export const logout = async (): Promise<void> => {
  try {
    await customFetch(LOGOUT_URL, { method: "POST" })
  } catch {
    // 위 주석 참고 — 결과와 무관하게 호출자는 상태를 정리한다.
  }
}
