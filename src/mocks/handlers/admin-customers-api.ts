import { delay, http } from "msw"
import type {
  AdminCustomerDetailResponse,
  AdminCustomerSummaryResponse,
} from "@/shared/api/generated"
import { requireMockPermission } from "@/mocks/handlers/auth"
import { fail, ok } from "@/mocks/lib/envelope"
import { maskName } from "@/shared/lib/format"
import { daysAgo } from "@/shared/lib/mock-date"

const MOCK_LATENCY_MS = 200

/** 마스킹 전 원본. 서버 `customer` 테이블 컬럼을 camelCase 로 옮긴 모양이다. */
type MockCustomer = {
  customerId: number
  userId: string
  userName: string
  birthDate: string
  email: string
  phoneNumber: string
  loginFailureCount: number
  accountLocked: boolean
  status: "ACTIVE" | "SUSPENDED"
  lastLoginAt: string | null
  joinedAt: string
}

/**
 * 정상, 잠김, 정지, 실패 누적 중간 상태를 섞어 둔다. 목록의 배지와 상세의 액션
 * 노출 조건이 상태마다 갈리므로, 한 종류만 있으면 화면을 확인할 수 없다.
 * 날짜는 `daysAgo()` 상대값이다(`shared/lib/mock-date.ts`).
 */
const INITIAL_CUSTOMERS: MockCustomer[] = [
  {
    customerId: 1,
    userId: "honggildong",
    userName: "홍길동",
    birthDate: "1990-01-01",
    email: "hong@corebank.example.com",
    phoneNumber: "01012345678",
    loginFailureCount: 0,
    accountLocked: false,
    status: "ACTIVE",
    lastLoginAt: `${daysAgo(0)}T09:14:22`,
    joinedAt: `${daysAgo(412)}T10:02:00`,
  },
  {
    customerId: 2,
    userId: "seojunpark",
    userName: "박서준",
    birthDate: "1993-06-15",
    email: "seojun@corebank.example.com",
    phoneNumber: "01023456789",
    loginFailureCount: 0,
    accountLocked: false,
    status: "ACTIVE",
    lastLoginAt: `${daysAgo(0)}T08:41:05`,
    joinedAt: `${daysAgo(388)}T14:25:00`,
  },
  {
    customerId: 3,
    userId: "minsookim",
    userName: "김민수",
    birthDate: "1988-11-23",
    email: "minsoo@corebank.example.com",
    phoneNumber: "01034567890",
    // POL-003: 5회 연속 실패로 잠긴 상태. 잠금 해제의 주 대상이다.
    loginFailureCount: 5,
    accountLocked: true,
    status: "ACTIVE",
    lastLoginAt: `${daysAgo(12)}T19:33:41`,
    joinedAt: `${daysAgo(240)}T11:10:00`,
  },
  {
    customerId: 4,
    userId: "jiwonlee",
    userName: "이지원",
    birthDate: "1995-03-08",
    email: "jiwon@corebank.example.com",
    phoneNumber: "01045678901",
    // 아직 잠기지 않은 중간 상태. 실패 횟수 표기가 잠금과 별개임을 보여준다.
    loginFailureCount: 3,
    accountLocked: false,
    status: "ACTIVE",
    lastLoginAt: `${daysAgo(2)}T21:07:15`,
    joinedAt: `${daysAgo(180)}T16:45:00`,
  },
  {
    customerId: 5,
    userId: "younajoo",
    userName: "주유나",
    birthDate: "1991-09-30",
    email: "youna@corebank.example.com",
    phoneNumber: "01056789012",
    loginFailureCount: 0,
    accountLocked: false,
    status: "SUSPENDED",
    lastLoginAt: `${daysAgo(45)}T13:20:09`,
    joinedAt: `${daysAgo(520)}T09:30:00`,
  },
  {
    customerId: 6,
    userId: "hyeonwoochoi",
    userName: "최현우",
    birthDate: "2000-05-17",
    email: "hyeonwoo@corebank.example.com",
    phoneNumber: "01067890123",
    loginFailureCount: 0,
    accountLocked: false,
    status: "ACTIVE",
    // 가입 후 한 번도 로그인하지 않은 계정. 상세의 "최근 로그인" 빈 값 처리를 본다.
    lastLoginAt: null,
    joinedAt: `${daysAgo(3)}T17:55:00`,
  },
  {
    customerId: 7,
    userId: "dayeonkim",
    userName: "김다연",
    birthDate: "1997-12-04",
    email: "dayeon@corebank.example.com",
    phoneNumber: "01078901234",
    loginFailureCount: 1,
    accountLocked: false,
    status: "ACTIVE",
    lastLoginAt: `${daysAgo(1)}T10:48:37`,
    joinedAt: `${daysAgo(300)}T08:05:00`,
  },
  {
    customerId: 8,
    userId: "sangjunpark",
    userName: "박상준",
    birthDate: "1985-07-21",
    email: "sangjun@corebank.example.com",
    phoneNumber: "01089012345",
    // 잠김과 정지가 겹친 계정. 잠금을 풀어도 정지는 남는 것을 화면에서 확인한다.
    loginFailureCount: 5,
    accountLocked: true,
    status: "SUSPENDED",
    lastLoginAt: `${daysAgo(88)}T12:02:58`,
    joinedAt: `${daysAgo(610)}T15:40:00`,
  },
  {
    customerId: 9,
    userId: "eunbijung",
    userName: "정은비",
    birthDate: "1999-02-14",
    email: "eunbi@corebank.example.com",
    phoneNumber: "01090123456",
    loginFailureCount: 0,
    accountLocked: false,
    status: "ACTIVE",
    lastLoginAt: `${daysAgo(6)}T20:11:44`,
    joinedAt: `${daysAgo(95)}T13:15:00`,
  },
  {
    customerId: 10,
    userId: "taeheonseo",
    userName: "서태헌",
    birthDate: "1982-04-02",
    email: "taeheon@corebank.example.com",
    phoneNumber: "01001234567",
    loginFailureCount: 4,
    accountLocked: false,
    status: "ACTIVE",
    lastLoginAt: `${daysAgo(20)}T07:25:13`,
    joinedAt: `${daysAgo(455)}T10:50:00`,
  },
  {
    customerId: 11,
    userId: "ssonghee",
    userName: "송희",
    birthDate: "1994-08-19",
    email: "songhee@corebank.example.com",
    phoneNumber: "01012349876",
    loginFailureCount: 0,
    accountLocked: true,
    status: "ACTIVE",
    // 실패 누적 없이 잠긴 계정(관리자가 직접 잠근 경우). 잠금 사유가 실패뿐이 아님을 보여준다.
    lastLoginAt: `${daysAgo(31)}T18:09:52`,
    joinedAt: `${daysAgo(205)}T12:00:00`,
  },
  {
    customerId: 12,
    userId: "gunlee",
    userName: "이건",
    birthDate: "1996-10-11",
    email: "gun@corebank.example.com",
    phoneNumber: "01098761234",
    loginFailureCount: 0,
    accountLocked: false,
    status: "ACTIVE",
    lastLoginAt: `${daysAgo(9)}T11:36:20`,
    joinedAt: `${daysAgo(150)}T09:20:00`,
  },
  // 회계 전용 관리자(#156) 계정의 고객 행. MOCK_MEMBERS 와 같은 성명, 생년월일을 쓴다.
  {
    customerId: 13,
    userId: "minjunlee",
    userName: "이민준",
    birthDate: "1995-03-08",
    email: "minjun@corebank.example.com",
    phoneNumber: "01055667788",
    loginFailureCount: 0,
    accountLocked: false,
    status: "ACTIVE",
    lastLoginAt: `${daysAgo(3)}T15:08:44`,
    joinedAt: `${daysAgo(240)}T11:10:00`,
  },
]

/** 변경은 새로고침 전까지 유지된다. 새로고침하면 처음 상태로 돌아간다. */
let customers: MockCustomer[] = INITIAL_CUSTOMERS.map((c) => ({ ...c }))

/** 서버 `CustomerInfoMasker` 와 같은 규칙. 화면이 서버와 같은 모양을 보게 한다. */
const maskUserId = (userId: string) =>
  userId.slice(0, 4) + "*".repeat(Math.max(0, userId.length - 4))
const maskBirthDate = (birthDate: string) => `${birthDate.slice(0, 4)}-**-**`
const maskPhoneNumber = (phone: string) =>
  `${phone.slice(0, 3)}****${phone.slice(7)}`
const maskEmail = (email: string) => {
  const at = email.indexOf("@")
  const local = email.slice(0, at)
  const visible = local.length <= 4 ? Math.max(0, local.length - 1) : 4
  return (
    local.slice(0, visible) +
    "*".repeat(local.length - visible) +
    email.slice(at)
  )
}

const toSummary = (c: MockCustomer): AdminCustomerSummaryResponse => ({
  customerId: c.customerId,
  userId: maskUserId(c.userId),
  userName: maskName(c.userName),
  email: maskEmail(c.email),
  loginFailureCount: c.loginFailureCount,
  accountLocked: c.accountLocked,
  status: c.status,
  lastLoginAt: c.lastLoginAt ?? undefined,
  joinedAt: c.joinedAt,
})

const toDetail = (c: MockCustomer): AdminCustomerDetailResponse => ({
  ...toSummary(c),
  birthDate: maskBirthDate(c.birthDate),
  phoneNumber: maskPhoneNumber(c.phoneNumber),
})

const notFound = () => fail("ATH0201", "존재하지 않는 사용자입니다.", 404)

const findCustomer = (params: { customerId?: string | readonly string[] }) =>
  customers.find((c) => c.customerId === Number(params.customerId))

const updateCustomer = (customerId: number, patch: Partial<MockCustomer>) => {
  customers = customers.map((c) =>
    c.customerId === customerId ? { ...c, ...patch } : c,
  )
  return customers.find((c) => c.customerId === customerId)!
}

const ACCESS_REASONS = ["CUSTOMER_REQUEST", "INCIDENT", "AUDIT", "OPERATION"]

/** 서버 PH-89: 사유 헤더가 없거나 정의되지 않은 코드면 400 CMN0007. */
const requireAccessReason = (request: Request) =>
  ACCESS_REASONS.includes(request.headers.get("X-Access-Reason") ?? "")
    ? null
    : fail("CMN0007", "조회 사유가 없거나 올바르지 않습니다.", 400)

const requireIdempotencyKey = (request: Request) =>
  request.headers.get("Idempotency-Key")
    ? null
    : fail("CMN0002", "필수 입력값이 누락되었습니다.", 400)

/**
 * ADM-01 관리자 고객 계정 운영 API(PH-97) MSW 목.
 *
 * 검색 규칙은 서버 `AdminCustomerQueryService` 와 같다. 조건이 하나도 없거나
 * 정상(ACTIVE), 잠김 아님(false)만 있으면 거부하고, 아이디와 성명은 두 글자 이상
 * 앞부분 일치, 이메일은 정확 일치다. 페이지는 0부터다. 다섯 API 모두 조회 사유
 * 헤더(PH-89)를 요구한다.
 */
export const adminCustomersApiHandlers = [
  http.get("*/admin/customers", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)
    const denied =
      requireMockPermission("CUSTOMER_READ") ?? requireAccessReason(request)
    if (denied) return denied

    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")?.trim() || null
    const userName = url.searchParams.get("userName")?.trim() || null
    const email = url.searchParams.get("email")?.trim() || null
    const accountLocked = url.searchParams.get("accountLocked")
    const status = url.searchParams.get("status")
    const page = Number(url.searchParams.get("page") ?? 0)
    const size = Number(url.searchParams.get("size") ?? 10)

    const qualifying =
      userId != null ||
      userName != null ||
      email != null ||
      accountLocked === "true" ||
      status === "SUSPENDED"
    if (!qualifying) {
      return fail("CMN0002", "검색 조건을 하나 이상 입력해 주세요.", 400)
    }
    if ((userId?.length ?? 2) < 2 || (userName?.length ?? 2) < 2) {
      return fail("CMN0001", "아이디·성명은 두 글자 이상 입력해 주세요.", 400)
    }

    const matched = customers.filter(
      (c) =>
        (userId == null || c.userId.startsWith(userId)) &&
        (userName == null || c.userName.startsWith(userName)) &&
        (email == null || c.email === email) &&
        (accountLocked == null || String(c.accountLocked) === accountLocked) &&
        (status == null || c.status === status),
    )

    return ok({
      page,
      size,
      totalCount: matched.length,
      totalPages: Math.ceil(matched.length / size),
      items: matched.slice(page * size, (page + 1) * size).map(toSummary),
    })
  }),

  http.get("*/admin/customers/:customerId", async ({ params, request }) => {
    await delay(MOCK_LATENCY_MS)
    const denied =
      requireMockPermission("CUSTOMER_READ") ?? requireAccessReason(request)
    if (denied) return denied
    const customer = findCustomer(params)
    return customer ? ok(toDetail(customer)) : notFound()
  }),

  http.post(
    "*/admin/customers/:customerId/unlock",
    async ({ params, request }) => {
      await delay(MOCK_LATENCY_MS)
      const denied =
        requireMockPermission("CUSTOMER_WRITE") ??
        requireAccessReason(request) ??
        requireIdempotencyKey(request)
      if (denied) return denied
      const customer = findCustomer(params)
      if (!customer) return notFound()
      const updated = updateCustomer(customer.customerId, {
        accountLocked: false,
        loginFailureCount: 0,
      })
      return ok({
        customerId: updated.customerId,
        accountLocked: updated.accountLocked,
        loginFailureCount: updated.loginFailureCount,
      })
    },
  ),

  http.post(
    "*/admin/customers/:customerId/status",
    async ({ params, request }) => {
      await delay(MOCK_LATENCY_MS)
      const denied =
        requireMockPermission("CUSTOMER_WRITE") ??
        requireAccessReason(request) ??
        requireIdempotencyKey(request)
      if (denied) return denied
      const customer = findCustomer(params)
      if (!customer) return notFound()
      const body = (await request.json()) as { status?: string }
      if (body.status !== "ACTIVE" && body.status !== "SUSPENDED") {
        return fail("CMN0001", "입력값이 올바르지 않습니다.", 400)
      }
      const updated = updateCustomer(customer.customerId, {
        status: body.status,
      })
      return ok({ customerId: updated.customerId, status: updated.status })
    },
  ),

  http.post(
    "*/admin/customers/:customerId/password-reset",
    async ({ params, request }) => {
      await delay(MOCK_LATENCY_MS)
      const denied =
        requireMockPermission("CUSTOMER_WRITE") ?? requireAccessReason(request)
      if (denied) return denied
      const customer = findCustomer(params)
      if (!customer) return notFound()
      const updated = updateCustomer(customer.customerId, {
        accountLocked: false,
        loginFailureCount: 0,
      })
      return ok({
        customerId: updated.customerId,
        temporaryPassword: `Tmp${crypto.randomUUID().slice(0, 8)}!1`,
        accountLocked: updated.accountLocked,
        loginFailureCount: updated.loginFailureCount,
      })
    },
  ),
]
