import type { RouteObject } from "react-router"
import {
  AuthedShellLayout,
  PublicShellLayout,
} from "@/app/layouts/shell-layout"
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

/**
 * 디자인 시스템 갤러리는 개발 빌드에서만 라우트에 오른다.
 * 요구사항정의서의 화면이 아니라 내부 참조용이다.
 */
const designSystemRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        handle: { crumb: "개인" },
        children: [
          {
            handle: { crumb: "공통", activeId: "user" },
            children: [
              {
                path: "design-system",
                element: <DesignSystemPage />,
                handle: { crumb: "디자인 시스템", title: "디자인 시스템" },
              },
            ],
          },
        ],
      },
    ]
  : []

/** 인증 없이 들어오는 화면. */
const publicRoutes: RouteObject = {
  element: <PublicShellLayout />,
  children: [
    { index: true, element: <A01Login />, handle: { bare: true } },
    {
      handle: { crumb: "홈" },
      children: [
        {
          handle: { crumb: "로그인" },
          children: [
            {
              path: "signup",
              element: <SignupFlow />,
              handle: { crumb: "회원가입" },
            },
            {
              path: "find-id",
              element: <A07FindId />,
              handle: { crumb: "아이디 찾기", title: "아이디 찾기" },
            },
            {
              path: "reset-password",
              element: <A08ResetPassword />,
              handle: { crumb: "비밀번호 재설정", title: "비밀번호 재설정" },
            },
          ],
        },
        {
          path: "logout",
          element: <A10LogoutComplete />,
          handle: { crumb: "로그아웃", title: "로그아웃 완료" },
        },
      ],
    },
    ...designSystemRoutes,
  ],
}

/** 로그인해야 들어갈 수 있는 화면. */
const authedRoutes: RouteObject = {
  element: <AuthedShellLayout />,
  children: [
    {
      handle: { crumb: "개인" },
      children: [
        {
          handle: { crumb: "메인" },
          children: [
            {
              path: "dashboard",
              element: <A09MainDashboard />,
              handle: { crumb: "대시보드", title: "메인 대시보드" },
            },
          ],
        },
      ],
    },
    {
      handle: { crumb: "조회", activeId: "inquiry" },
      children: [
        {
          handle: { crumb: "계좌조회" },
          children: [
            {
              path: "accounts",
              element: <B01AllAccounts />,
              handle: { crumb: "전체계좌", title: "전체계좌조회" },
            },
            {
              path: "accounts/deposits",
              element: <B02DepositAccounts />,
              handle: { crumb: "예금·적금", title: "예금/적금 계좌조회" },
            },
            {
              path: "inquiry",
              element: <B03TransactionInquiry />,
              handle: {
                crumb: "거래내역",
                title: "거래내역조회",
                notice: [
                  "거래내역은 최근 1년 이내의 범위에서 조회할 수 있습니다.",
                  "조회 기준일시 이후 발생한 거래는 다음 조회 시 반영됩니다.",
                  "실제 잔액은 미결제 거래 처리 상태에 따라 달라질 수 있습니다.",
                ],
              },
            },
          ],
        },
      ],
    },
    {
      handle: { crumb: "이체", activeId: "transfer" },
      children: [
        {
          handle: { crumb: "즉시이체" },
          children: [
            {
              path: "instant-transfer",
              element: <InstantTransferScreen />,
              handle: { crumb: "당행이체" },
            },
            {
              path: "transfer/history",
              element: <D04TransferHistory />,
              handle: { crumb: "이체결과조회", title: "이체결과조회" },
            },
          ],
        },
        {
          handle: { crumb: "예약이체" },
          children: [
            {
              path: "transfer/reservation/new",
              element: <ReservedTransferScreen />,
              handle: { crumb: "예약이체 등록" },
            },
            {
              path: "transfer/reservation",
              element: <E04ReservationList />,
              handle: {
                crumb: "예약이체등록 조회·취소",
                title: "예약이체 조회/취소",
              },
            },
            {
              path: "transfer/reservation/history",
              element: <E05ReservationResults />,
              handle: {
                crumb: "예약이체 처리결과 조회",
                title: "예약이체 처리결과 조회",
              },
            },
          ],
        },
        {
          handle: { crumb: "자동이체" },
          children: [
            {
              path: "transfer/auto/new",
              element: <AutoTransferScreen />,
              handle: { crumb: "자동이체 등록" },
            },
            {
              path: "transfer/auto",
              element: <G04AutoTransferList />,
              handle: {
                crumb: "자동이체 조회·변경·해지",
                title: "자동이체 조회/변경/해지",
              },
            },
            {
              path: "transfer/auto/history",
              element: <G05AutoTransferResults />,
              handle: {
                crumb: "자동이체결과 조회",
                title: "자동이체 결과조회",
              },
            },
          ],
        },
      ],
    },
    {
      handle: { crumb: "사용자관리", activeId: "user" },
      children: [
        {
          handle: { crumb: "계좌관리" },
          children: [
            {
              path: "user/accounts/password",
              element: <B04AccountPassword />,
              handle: { crumb: "계좌비밀번호", title: "계좌비밀번호 변경" },
            },
            {
              path: "user/accounts/withdrawal",
              element: <B05WithdrawAccounts />,
              handle: { crumb: "출금계좌관리", title: "출금계좌관리" },
            },
            {
              path: "user/accounts/alias",
              element: <B06AccountAlias />,
              handle: { crumb: "계좌별명관리", title: "계좌별명 관리" },
            },
            {
              path: "user/accounts/order",
              element: <B07AccountOrder />,
              handle: { crumb: "계좌순서변경", title: "계좌순서 변경" },
            },
          ],
        },
        {
          path: "user/profile",
          element: <F01Profile />,
          handle: { crumb: "고객정보관리", title: "고객정보 조회/변경" },
        },
        {
          path: "user/transfer-limit",
          element: <D05TransferLimit />,
          handle: { crumb: "이체한도관리", title: "이체한도 조회/변경" },
        },
      ],
    },
    {
      handle: { crumb: "금융상품", activeId: "product" },
      children: [
        {
          handle: { crumb: "예금·적금" },
          children: [
            {
              path: "products",
              element: <C01ProductList />,
              handle: { crumb: "상품목록", title: "상품몰 - 상품목록" },
            },
            {
              path: "products/:productId",
              element: <C02ProductDetail />,
              handle: { crumb: "상품상세", title: "상품 상세" },
            },
          ],
        },
        {
          handle: { crumb: "가입" },
          children: [
            { path: "product/:productId/join/1", element: <C03Terms /> },
            { path: "product/:productId/join/2", element: <C04InputInfo /> },
            { path: "product/:productId/join/3", element: <C05ConfirmAuth /> },
            { path: "product/:productId/join/4", element: <C06Complete /> },
          ],
        },
      ],
    },
    {
      handle: { crumb: "헤더" },
      children: [
        {
          path: "notifications",
          element: <F02NotificationInbox />,
          handle: { crumb: "알림", title: "알림함" },
        },
      ],
    },
  ],
}

export const customerRoutes: RouteObject[] = [publicRoutes, authedRoutes]
