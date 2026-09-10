import { Route } from "react-router"
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

/**
 * 고객 채널 라우트. `<Routes>` 는 자식으로 `<Route>` 나 Fragment 만 받으므로
 * 컴포넌트가 아니라 **엘리먼트 값**으로 내보낸다 — `<CustomerRoutes />` 로 감싸면
 * React Router 가 내부의 `<Route>` 를 찾지 못한다.
 */
export const customerRoutes = (
  <>
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
  </>
)
