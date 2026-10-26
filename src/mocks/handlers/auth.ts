import { delay, http } from "msw"
import {
  MOCK_MEMBERS,
  type AdminPermission,
  type SessionRole,
} from "@/entities/auth"
import {
  ADMIN_SESSION_TIMEOUT_SECONDS,
  SESSION_TIMEOUT_SECONDS,
} from "@/shared/config/policy"
import { maskName } from "@/shared/lib/format"
import { readMockAuthority } from "@/mocks/handlers/admin"
import { fail, ok } from "@/mocks/lib/envelope"

const MOCK_LATENCY_MS = 200

/**
 * e2e 가 실서버 없이 로그인·로그아웃을 밟게 하는 최소 페이크.
 *
 * 실계정으로 e2e 를 돌리면 POL-003(5회 연속 실패 시 잠금) 때문에 스펙이 한 번
 * 어긋나는 순간 계정이 잠겨 CI 가 영구히 죽는다. 자격증명은 A-07·A-08 이 쓰는
 * MOCK_MEMBERS 를 그대로 재사용한다.
 *
 * 경로는 base 를 박지 않고 끝부분만 맞춘다 — VITE_API_BASE_URL 이 바뀌어도(로컬 프록시
 * /api/v1, 배포 절대 URL) 같은 핸들러가 걸린다. 단위 테스트의 서버 페이크도 같은 형태다.
 */
const SESSION_KEY = "corebank-mock-session"

/**
 * 핸들러는 페이지 컨텍스트에서 실행돼 새로고침하면 모듈 상태가 사라진다.
 * 세션 복원(GET /customers/me)을 검증하려면 리로드를 견뎌야 하므로
 * sessionStorage 에 둔다 — 탭을 닫으면 사라져 테스트 간 격리도 유지된다.
 */
export const readSignedInMemberId = (): string | null => {
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

export const unauthorized = () =>
  fail("CMN0101", "인증정보가 없거나 세션이 만료되었습니다.", 401)

/**
 * 관리자 조회 API 의 진입 검사 — 로그인(401 `CMN0101`) → 권한(403 `CMN0102`).
 * 통과하면 `null` 이라 핸들러는 `requireMockPermission(...) ?? ok(...)` 로 쓴다.
 */
export const requireMockPermission = (permission: AdminPermission) => {
  const memberId = readSignedInMemberId()
  if (memberId == null) return unauthorized()
  if (!readMockAuthority(memberId).permissions.includes(permission)) {
    return fail("CMN0102", "해당 자원에 접근할 권한이 없습니다.", 403)
  }
  return null
}

/**
 * 서버는 경로마다 받는 역할이 정해져 있다 — 고객은 `/auth/login`, 관리자는
 * `/admin/auth/login`(서버 `docs/phase2/admin_auth.md` 결정 ③). 역할이 맞지 않으면
 * 아이디·비밀번호 불일치와 같은 ATH0101 을 준다. 다르게 주면 관리자 계정의 존재가
 * 드러난다. 만료 간격도 역할을 따른다(결정 ④).
 */
const login = async (
  request: Request,
  role: SessionRole,
  timeoutSeconds: number,
) => {
  await delay(MOCK_LATENCY_MS)
  const { userId, password } = (await request.json()) as {
    userId: string
    password: string
  }
  const member = MOCK_MEMBERS.find(
    (m) => m.memberId === userId && m.loginPassword === password,
  )
  if (!member || readMockAuthority(member.memberId).role !== role) {
    return fail("ATH0101", "아이디 또는 비밀번호가 일치하지 않습니다.", 401)
  }

  writeSignedInMemberId(member.memberId)
  return ok({
    customerId: 1,
    userName: member.ownerName,
    sessionExpiresAt: new Date(
      Date.now() + timeoutSeconds * 1000,
    ).toISOString(),
  })
}

export const authHandlers = [
  // 관리자 경로가 먼저 와야 한다. `*` 는 `/` 도 건너뛰어서, 아래 `*/auth/login` 이
  // 앞에 있으면 `/admin/auth/login` 요청까지 그쪽이 가로챈다.
  http.post("*/admin/auth/login", ({ request }) =>
    login(request, "ADMIN", ADMIN_SESSION_TIMEOUT_SECONDS),
  ),
  http.post("*/auth/login", ({ request }) =>
    login(request, "CUSTOMER", SESSION_TIMEOUT_SECONDS),
  ),

  http.post("*/auth/logout", async () => {
    await delay(MOCK_LATENCY_MS)
    writeSignedInMemberId(null)
    return ok(null)
  }),

  http.get("*/customers/me", async () => {
    await delay(MOCK_LATENCY_MS)
    const signedInMemberId = readSignedInMemberId()
    const member = MOCK_MEMBERS.find((m) => m.memberId === signedInMemberId)
    if (!member) return unauthorized()

    return ok({
      customerId: 1,
      // 서버는 CustomerInfoResponse.userName 을 마스킹해 내려준다(REQ-CMN-018).
      userName: maskName(member.ownerName),
      userId: member.memberId,
      birthDate: member.birth,
      phoneNumber: "010****5678",
      email: member.email,
      joinedAt: "2026-08-01T10:00:00+09:00",
      // 서버 스펙에 아직 없는 필드. entities/auth 의 readSessionAuthority 가 읽는다.
      ...readMockAuthority(member.memberId),
    })
  }),

  http.get("*/dashboard/login-status", async () => {
    await delay(MOCK_LATENCY_MS)
    if (readSignedInMemberId() == null) return unauthorized()

    return ok({
      previousLoginAt: "2026-08-23T08:57:34",
      currentLoginIp: "203.245.11.87",
      lastTransactionAt: "2026-08-23T08:41:02",
    })
  }),
]
