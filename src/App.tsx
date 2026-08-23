import * as React from "react"
import { Routes, Route, Link, useLocation, useNavigate } from "react-router"
import { PageShell } from "@/app/page-shell"
import { A01Login, B03TransactionInquiry } from "@/pages"
import {
  B04AccountPassword,
  B05WithdrawAccounts,
  B06AccountAlias,
  B07AccountOrder,
} from "@/pages/account"
import {
  A07FindId,
  A08ResetPassword,
  A10LogoutComplete,
  SignupFlow,
} from "@/pages/auth"
import { A09MainDashboard } from "@/pages/dashboard"
import { DesignSystemPage } from "@/pages/design-system"
import {
  B01AllAccounts,
  B02DepositAccounts,
  D04TransferHistory,
  E04ReservationList,
  E05ReservationResults,
  F02NotificationInbox,
  G04AutoTransferList,
  G05AutoTransferResults,
} from "@/pages/inquiry"
import { F01Profile } from "@/pages/mypage"
import {
  C01ProductList,
  C02ProductDetail,
  C03Terms,
  C04InputInfo,
  C05ConfirmAuth,
  C06Complete,
} from "@/pages/product"
import {
  AutoTransferScreen,
  D05TransferLimit,
  InstantTransferScreen,
  ReservedTransferScreen,
} from "@/pages/transfer"
import { RequireAuth } from "@/app/require-auth"
import { useSession } from "@/features/session"
import { SessionExpiredModal } from "@/entities/auth"
import { cn } from "@/shared/lib/utils"

/** 개발용 라우트 목록 — 파트(A~G)별 화면ID 그룹. 디자인 시스템에 포함되지 않는다. */
type DevRoute = {
  screenId: string
  label: string
  path: string
}

const DEV_ROUTES: DevRoute[] = [
  { screenId: "A-01", label: "로그인", path: "/" },
  { screenId: "A-02", label: "회원가입 1단계", path: "/signup?step=1" },
  { screenId: "A-03", label: "회원가입 2단계", path: "/signup?step=2" },
  { screenId: "A-04", label: "회원가입 3단계", path: "/signup?step=3" },
  { screenId: "A-05", label: "회원가입 4단계", path: "/signup?step=4" },
  { screenId: "A-06", label: "회원가입 5단계", path: "/signup?step=5" },
  { screenId: "A-07", label: "아이디 찾기", path: "/find-id" },
  { screenId: "A-08", label: "비밀번호 재설정", path: "/reset-password" },
  { screenId: "A-09", label: "메인 대시보드", path: "/dashboard" },
  { screenId: "A-10", label: "로그아웃 완료", path: "/logout" },

  { screenId: "B-01", label: "전체계좌조회", path: "/accounts" },
  { screenId: "B-02", label: "예금/적금 계좌조회", path: "/accounts/deposits" },
  { screenId: "B-03", label: "거래내역조회", path: "/inquiry" },
  {
    screenId: "B-04",
    label: "계좌비밀번호 변경",
    path: "/user/accounts/password",
  },
  {
    screenId: "B-05",
    label: "출금계좌관리",
    path: "/user/accounts/withdrawal",
  },
  { screenId: "B-06", label: "계좌별명 관리", path: "/user/accounts/alias" },
  { screenId: "B-07", label: "계좌순서 변경", path: "/user/accounts/order" },

  { screenId: "C-01", label: "상품목록", path: "/products" },
  { screenId: "C-02", label: "상품상세", path: "/products/1" },
  { screenId: "C-03", label: "상품가입 1단계", path: "/product/1/join/1" },
  { screenId: "C-04", label: "상품가입 2단계", path: "/product/1/join/2" },
  { screenId: "C-05", label: "상품가입 3단계", path: "/product/1/join/3" },
  { screenId: "C-06", label: "상품가입 4단계", path: "/product/1/join/4" },

  { screenId: "D-01", label: "즉시이체", path: "/instant-transfer" },
  { screenId: "D-04", label: "이체결과조회", path: "/transfer/history" },
  {
    screenId: "D-05",
    label: "이체한도 조회/변경",
    path: "/user/transfer-limit",
  },

  {
    screenId: "E-01",
    label: "예약이체 등록",
    path: "/transfer/reservation/new",
  },
  {
    screenId: "E-04",
    label: "예약이체 조회/취소",
    path: "/transfer/reservation",
  },
  {
    screenId: "E-05",
    label: "예약이체 처리결과 조회",
    path: "/transfer/reservation/history",
  },

  { screenId: "F-01", label: "고객정보 조회/변경", path: "/user/profile" },
  { screenId: "F-02", label: "알림함", path: "/notifications" },

  { screenId: "G-01", label: "자동이체 등록", path: "/transfer/auto/new" },
  {
    screenId: "G-04",
    label: "자동이체 조회/변경/해지",
    path: "/transfer/auto",
  },
  {
    screenId: "G-05",
    label: "자동이체 결과조회",
    path: "/transfer/auto/history",
  },

  { screenId: "DS", label: "디자인 시스템", path: "/design-system" },
]

const DEV_PARTS = ["A", "B", "C", "D", "E", "F", "G", "DS"] as const

const DevNav = () => {
  const location = useLocation()
  const [open, setOpen] = React.useState(false)

  return (
    <div className="fixed right-4 bottom-4 z-toast">
      {open && (
        <div className="mb-2 max-h-[70vh] w-[720px] overflow-y-auto rounded-lg border bg-white p-4 shadow-lg">
          <div className="grid grid-cols-4 gap-x-6 gap-y-4">
            {DEV_PARTS.map((part) => {
              const routes = DEV_ROUTES.filter(
                (r) => r.screenId.split("-")[0] === part,
              )
              if (routes.length === 0) return null
              return (
                <div key={part}>
                  <p className="mb-1.5 text-[13px] font-bold text-ink-faint">
                    {part}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {routes.map((r) => (
                      <li key={`${r.screenId}-${r.path}`}>
                        <Link
                          to={r.path}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "block text-[13px] leading-snug",
                            location.pathname === r.path
                              ? "font-bold text-primary"
                              : "text-ink-muted hover:text-primary",
                          )}
                        >
                          {r.screenId} {r.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border bg-white px-4 py-1.5 text-base font-bold text-ink-muted shadow-lg hover:bg-surface"
      >
        개발 메뉴
      </button>
    </div>
  )
}

/**
 * A-11 세션 만료. SessionProvider의 10분 무조작 타이머가 만료되면 전 화면
 * 위에 비해제형 모달을 띄운다(REQ-AUTH-031).
 */
const SessionExpiredGate = () => {
  const { expiredReason, acknowledgeExpired } = useSession()
  const navigate = useNavigate()

  if (expiredReason == null) return null

  const goRelogin = () => {
    acknowledgeExpired()
    navigate("/", { replace: true })
  }
  // 만료 후에는 대시보드가 RequireAuth 에 막히므로 어차피 로그인 화면으로 튕긴다.
  // 튕겨서 도착하게 두면 버튼이 먹지 않는 것처럼 보여, 도착지를 명시한다
  // (REQ-AUTH-031 이 버튼 2개를 요구하므로 버튼 자체는 유지한다).
  // 그 결과 [다시 로그인]과 동작이 같아졌다 — 라벨이 하는 약속과 어긋나므로
  // 요구사항 해석을 #95 에서 확정한다.
  const goMain = () => {
    acknowledgeExpired()
    navigate("/", { replace: true })
  }

  return (
    <SessionExpiredModal open onRelogin={goRelogin} onMainScreen={goMain} />
  )
}

const App = () => {
  return (
    <>
      {/* Dev-only route switcher (not part of the design system). 프로덕션 빌드에서 제외된다. */}
      {import.meta.env.DEV && <DevNav />}
      <SessionExpiredGate />

      <Routes>
        <Route
          path="/"
          element={
            <PageShell bare>
              <A01Login />
            </PageShell>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <PageShell
                breadcrumb={["개인", "메인", "대시보드"]}
                title="메인 대시보드"
              >
                <A09MainDashboard />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/inquiry"
          element={
            <RequireAuth>
              <PageShell
                activeId="inquiry"
                breadcrumb={["조회", "계좌조회", "거래내역"]}
                title="거래내역조회"
                notice={[
                  "거래내역은 최근 1년 이내의 범위에서 조회할 수 있습니다.",
                  "조회 기준일시 이후 발생한 거래는 다음 조회 시 반영됩니다.",
                  "실제 잔액은 미결제 거래 처리 상태에 따라 달라질 수 있습니다.",
                ]}
              >
                <B03TransactionInquiry />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/instant-transfer"
          element={
            <RequireAuth>
              <PageShell
                activeId="transfer"
                breadcrumb={["이체", "즉시이체", "당행이체"]}
              >
                <InstantTransferScreen />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/transfer/reservation/new"
          element={
            <RequireAuth>
              <PageShell
                activeId="transfer"
                breadcrumb={["이체", "예약이체", "예약이체 등록"]}
              >
                <ReservedTransferScreen />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/transfer/auto/new"
          element={
            <RequireAuth>
              <PageShell
                activeId="transfer"
                breadcrumb={["이체", "자동이체", "자동이체 등록"]}
              >
                <AutoTransferScreen />
              </PageShell>
            </RequireAuth>
          }
        />
        {import.meta.env.DEV && (
          <Route
            path="/design-system"
            element={
              <PageShell
                activeId="user"
                breadcrumb={["개인", "공통", "디자인 시스템"]}
                title="디자인 시스템"
              >
                <DesignSystemPage />
              </PageShell>
            }
          />
        )}

        <Route
          path="/accounts"
          element={
            <RequireAuth>
              <PageShell
                activeId="inquiry"
                breadcrumb={["조회", "계좌조회", "전체계좌"]}
                title="전체계좌조회"
              >
                <B01AllAccounts />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/accounts/deposits"
          element={
            <RequireAuth>
              <PageShell
                activeId="inquiry"
                breadcrumb={["조회", "계좌조회", "예금·적금"]}
                title="예금/적금 계좌조회"
              >
                <B02DepositAccounts />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/transfer/history"
          element={
            <RequireAuth>
              <PageShell
                activeId="transfer"
                breadcrumb={["이체", "즉시이체", "이체결과조회"]}
                title="이체결과조회"
              >
                <D04TransferHistory />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/transfer/reservation"
          element={
            <RequireAuth>
              <PageShell
                activeId="transfer"
                breadcrumb={["이체", "예약이체", "예약이체등록 조회·취소"]}
                title="예약이체 조회/취소"
              >
                <E04ReservationList />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/transfer/reservation/history"
          element={
            <RequireAuth>
              <PageShell
                activeId="transfer"
                breadcrumb={["이체", "예약이체", "예약이체 처리결과 조회"]}
                title="예약이체 처리결과 조회"
              >
                <E05ReservationResults />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/transfer/auto"
          element={
            <RequireAuth>
              <PageShell
                activeId="transfer"
                breadcrumb={["이체", "자동이체", "자동이체 조회·변경·해지"]}
                title="자동이체 조회/변경/해지"
              >
                <G04AutoTransferList />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/transfer/auto/history"
          element={
            <RequireAuth>
              <PageShell
                activeId="transfer"
                breadcrumb={["이체", "자동이체", "자동이체결과 조회"]}
                title="자동이체 결과조회"
              >
                <G05AutoTransferResults />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/user/accounts/password"
          element={
            <RequireAuth>
              <PageShell
                activeId="user"
                breadcrumb={["사용자관리", "계좌관리", "계좌비밀번호"]}
                title="계좌비밀번호 변경"
              >
                <B04AccountPassword />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/user/accounts/withdrawal"
          element={
            <RequireAuth>
              <PageShell
                activeId="user"
                breadcrumb={["사용자관리", "계좌관리", "출금계좌관리"]}
                title="출금계좌관리"
              >
                <B05WithdrawAccounts />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/user/accounts/alias"
          element={
            <RequireAuth>
              <PageShell
                activeId="user"
                breadcrumb={["사용자관리", "계좌관리", "계좌별명관리"]}
                title="계좌별명 관리"
              >
                <B06AccountAlias />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/user/accounts/order"
          element={
            <RequireAuth>
              <PageShell
                activeId="user"
                breadcrumb={["사용자관리", "계좌관리", "계좌순서변경"]}
                title="계좌순서 변경"
              >
                <B07AccountOrder />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/user/profile"
          element={
            <RequireAuth>
              <PageShell
                activeId="user"
                breadcrumb={["사용자관리", "고객정보관리"]}
                title="고객정보 조회/변경"
              >
                <F01Profile />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/user/transfer-limit"
          element={
            <RequireAuth>
              <PageShell
                activeId="user"
                breadcrumb={["사용자관리", "이체한도관리"]}
                title="이체한도 조회/변경"
              >
                <D05TransferLimit />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/signup"
          element={
            <PageShell breadcrumb={["홈", "로그인", "회원가입"]}>
              <SignupFlow />
            </PageShell>
          }
        />
        <Route
          path="/find-id"
          element={
            <PageShell
              breadcrumb={["홈", "로그인", "아이디 찾기"]}
              title="아이디 찾기"
            >
              <A07FindId />
            </PageShell>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PageShell
              breadcrumb={["홈", "로그인", "비밀번호 재설정"]}
              title="비밀번호 재설정"
            >
              <A08ResetPassword />
            </PageShell>
          }
        />
        <Route
          path="/logout"
          element={
            <PageShell breadcrumb={["홈", "로그아웃"]} title="로그아웃 완료">
              <A10LogoutComplete />
            </PageShell>
          }
        />
        <Route
          path="/notifications"
          element={
            <RequireAuth>
              <PageShell breadcrumb={["헤더", "알림"]} title="알림함">
                <F02NotificationInbox />
              </PageShell>
            </RequireAuth>
          }
        />

        <Route
          path="/products"
          element={
            <RequireAuth>
              <PageShell
                activeId="product"
                breadcrumb={["금융상품", "예금·적금", "상품목록"]}
                title="상품몰 - 상품목록"
              >
                <C01ProductList />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/products/:productId"
          element={
            <RequireAuth>
              <PageShell
                activeId="product"
                breadcrumb={["금융상품", "예금·적금", "상품상세"]}
                title="상품 상세"
              >
                <C02ProductDetail />
              </PageShell>
            </RequireAuth>
          }
        />

        <Route
          path="/product/:productId/join/1"
          element={
            <RequireAuth>
              <PageShell activeId="product" breadcrumb={["금융상품", "가입"]}>
                <C03Terms />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/product/:productId/join/2"
          element={
            <RequireAuth>
              <PageShell activeId="product" breadcrumb={["금융상품", "가입"]}>
                <C04InputInfo />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/product/:productId/join/3"
          element={
            <RequireAuth>
              <PageShell activeId="product" breadcrumb={["금융상품", "가입"]}>
                <C05ConfirmAuth />
              </PageShell>
            </RequireAuth>
          }
        />
        <Route
          path="/product/:productId/join/4"
          element={
            <RequireAuth>
              <PageShell activeId="product" breadcrumb={["금융상품", "가입"]}>
                <C06Complete />
              </PageShell>
            </RequireAuth>
          }
        />
      </Routes>
    </>
  )
}

export default App
