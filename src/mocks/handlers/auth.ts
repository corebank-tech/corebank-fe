import { delay, http } from "msw"
import { MOCK_MEMBERS } from "@/entities/auth"
import { fail, ok } from "@/mocks/lib/envelope"

const MOCK_LATENCY_MS = 200

/**
 * e2e 가 실서버 없이 로그인·로그아웃을 밟게 하는 최소 페이크.
 *
 * 실계정으로 e2e 를 돌리면 POL-003(5회 연속 실패 시 잠금) 때문에 스펙이 한 번
 * 어긋나는 순간 계정이 잠겨 CI 가 영구히 죽는다. 자격증명은 A-07·A-08 이 쓰는
 * MOCK_MEMBERS 를 그대로 재사용한다.
 */
const SESSION_KEY = "corebank-mock-session"

/**
 * 핸들러는 페이지 컨텍스트에서 실행돼 새로고침하면 모듈 상태가 사라진다.
 * 세션 복원(GET /customers/me)을 검증하려면 리로드를 견뎌야 하므로
 * sessionStorage 에 둔다 — 탭을 닫으면 사라져 테스트 간 격리도 유지된다.
 */
const readSignedInMemberId = (): string | null => {
  try {
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

const writeSignedInMemberId = (memberId: string | null): void => {
  try {
    if (memberId == null) sessionStorage.removeItem(SESSION_KEY)
    else sessionStorage.setItem(SESSION_KEY, memberId)
  } catch {
    // 저장소를 못 쓰는 환경이면 세션 없는 상태로 동작한다.
  }
}

/** 마스킹 규칙은 서버(CustomerInfoResponse.userName)를 흉내낸 것이다: 홍길동 → 홍*동. */
const maskName = (name: string) =>
  name.length <= 2
    ? name
    : `${name[0]}${"*".repeat(name.length - 2)}${name.at(-1)}`

const unauthorized = () =>
  fail("CMN0101", "인증정보가 없거나 세션이 만료되었습니다.", 401)

export const authHandlers = [
  http.post("*/api/v1/auth/login", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)
    const { userId, password } = (await request.json()) as {
      userId: string
      password: string
    }
    const member = MOCK_MEMBERS.find(
      (m) => m.memberId === userId && m.loginPassword === password,
    )
    if (!member) {
      return fail("ATH0101", "아이디 또는 비밀번호가 일치하지 않습니다.", 401)
    }

    writeSignedInMemberId(member.memberId)
    return ok({
      customerId: 1,
      userName: member.ownerName,
      sessionExpiresAt: new Date(Date.now() + 600_000).toISOString(),
    })
  }),

  http.post("*/api/v1/auth/logout", async () => {
    await delay(MOCK_LATENCY_MS)
    writeSignedInMemberId(null)
    return ok(null)
  }),

  http.get("*/api/v1/customers/me", async () => {
    await delay(MOCK_LATENCY_MS)
    const signedInMemberId = readSignedInMemberId()
    const member = MOCK_MEMBERS.find((m) => m.memberId === signedInMemberId)
    if (!member) return unauthorized()

    return ok({
      customerId: 1,
      userName: maskName(member.ownerName),
      userId: member.memberId,
      birthDate: member.birth,
      phoneNumber: "010****5678",
      email: member.email,
      joinedAt: "2026-08-01T10:00:00+09:00",
    })
  }),

  http.get("*/api/v1/dashboard/login-status", async () => {
    await delay(MOCK_LATENCY_MS)
    if (readSignedInMemberId() == null) return unauthorized()

    return ok({
      previousLoginAt: "2026-08-23T08:57:34",
      currentLoginIp: "203.245.11.87",
      lastTransactionAt: "2026-08-23T08:41:02",
    })
  }),
]
