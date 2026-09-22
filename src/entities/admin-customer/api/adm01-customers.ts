import { daysAgo } from "@/shared/lib/mock-date"

/**
 * ADM-01 관리자 고객 계정 운영 목업 데이터.
 *
 * 대응 서버 API(PH-97)가 아직 없어 화면이 이 표를 직접 들고 돈다. 실 API가 도착하면
 * 이 파일의 `MOCK_*` 만 걷어내고 타입은 생성 타입으로 교체한다.
 *
 * 필드는 서버 `customer` 테이블(`V202608010900__create_customer_auth.sql`)의 컬럼명을
 * camelCase 로 옮긴 것이다 — 화면이 먼저 서고 API가 뒤에 오는 구조라, 이름을 임의로
 * 지으면 나중에 전부 어긋난다.
 *
 * **`MOCK_MEMBERS`(entities/auth)를 재사용하지 않는다.** A-07 아이디찾기·A-08 비밀번호
 * 재설정 화면이 그 픽스처의 `errorCount`·`status` 를 실행 중에 직접 바꾸기 때문에,
 * 관리자 화면이 같은 배열을 건드리면 무관한 화면의 기대값이 흔들린다. 아이디·성명만
 * 같은 값을 써서 로그인 계정과의 대응이 보이게 한다.
 */

/**
 * 계정 상태. **서버에 아직 없는 필드다** — `customer` 테이블에 `status` 컬럼이 없고
 * P3 트랙 S0 항목의 Flyway 로 추가될 예정이다. 이 화면이 그 계약을 먼저 정의한다.
 */
export type AdminCustomerStatus = "ACTIVE" | "SUSPENDED"

export type AdminCustomer = {
  customerId: number
  /** 로그인 아이디 (`customer.user_id`). */
  userId: string
  userName: string
  /** ISO date (`customer.birth_date`). */
  birthDate: string
  email: string
  /** 하이픈 없는 11자리 (`customer.phone_number`). */
  phoneNumber: string
  /** 연속 로그인 실패 횟수. POL-003 기준 5회에서 잠긴다. */
  loginFailureCount: number
  /** `customer.account_locked`. 잠금 해제(REQ-AUTH-026)의 대상. */
  accountLocked: boolean
  status: AdminCustomerStatus
  /** ISO datetime. 한 번도 로그인하지 않았으면 null. */
  lastLoginAt: string | null
  /** ISO datetime. */
  joinedAt: string
}

/**
 * 정상 · 잠김 · 정지 · 실패 누적 중간 상태를 섞어 둔다 — 목록의 배지와 상세의 액션
 * 노출 조건이 상태마다 갈리므로, 한 종류만 있으면 화면을 만들면서 확인할 수 없다.
 *
 * 날짜는 전부 `daysAgo()` 상대값이다. 고정 날짜를 쓰면 시간이 지날수록 "최근 로그인"이
 * 과거로 밀려 화면이 실제와 어긋난다(`shared/lib/mock-date.ts`).
 */
export const MOCK_ADMIN_CUSTOMERS: AdminCustomer[] = [
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
  /**
   * 회계 전용 관리자(#156)의 짝. 이 화면의 시나리오에 필요해서 넣은 것이 아니라,
   * `MOCK_MEMBERS` 전원이 여기 같은 성명·생년월일로 있어야 한다는 규칙
   * (`adm01-customers.test.ts`)을 지키기 위한 항목이다.
   */
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
