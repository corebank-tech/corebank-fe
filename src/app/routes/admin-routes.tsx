import type React from "react"
import type { RouteObject } from "react-router"
import type { AdminPermission } from "@/entities/auth"

/** 관리자 채널 경로인지. 도착지를 채널별로 가를 때 쓴다(세션 만료·오류 화면). */
export const isAdminPath = (pathname: string) =>
  pathname === "/admin" || pathname.startsWith("/admin/")

/**
 * 화면을 권한 가드로 감싼 `lazy` 를 만든다(REQ-ADM-004).
 *
 * 가드를 **`lazy` 안에서** 동적으로 불러온다. 파일 맨 위에서 정적으로 import 하면
 * 이 모듈이 루트 라우트 트리에 eager 로 물려 있어 관리자 403 화면과 그 의존이
 * 고객 번들로 딸려 들어간다 — ADR 0001 이 `lazy` 로 갈라 둔 경계가 무너진다.
 * `AdminPermission` 은 타입이라 `import type` 으로 두면 런타임에 남지 않는다.
 */
const guardedLazy =
  (permission: AdminPermission, load: () => Promise<React.ComponentType>) =>
  async () => {
    const [{ RequirePermission }, Screen] = await Promise.all([
      import("@/app/require-permission"),
      load(),
    ])

    return {
      Component: () => (
        <RequirePermission permission={permission}>
          <Screen />
        </RequirePermission>
      ),
    }
  }

/**
 * 관리자 채널 라우트.
 *
 * 화면을 `lazy` 로 불러 고객이 받는 번들에 관리자 코드가 섞이지 않게 한다.
 * 관리자 채널을 별도 앱으로 분리하지 않기로 한 결정(#126)의 보완책이고,
 * PH-58 에서 엣지 접근제어를 `/admin` 경로에 얹을 수 있는 형태를 유지한다.
 */
export const adminRoutes: RouteObject = {
  path: "admin",
  children: [
    {
      path: "login",
      lazy: async () => {
        const { AdminLogin } = await import("@/pages/admin")
        return { Component: AdminLogin }
      },
    },
    {
      lazy: async () => {
        const { AdminShellLayout } =
          await import("@/app/layouts/admin-shell-layout")
        return { Component: AdminShellLayout }
      },
      children: [
        {
          index: true,
          handle: { title: "관리자 홈" },
          lazy: async () => {
            const { AdminHome } = await import("@/pages/admin")
            return { Component: AdminHome }
          },
        },
        // 아래 세 화면은 권한 게이트를 지난다. 관리자 홈(index)은 권한 조건이
        // 없어 감싸지 않는다 — `shared/config/admin-nav.ts` 의 "관리" 그룹과 같다.
        // 여기 적은 권한은 네비 설정의 `requiresPermission` 과 같아야 한다.
        {
          path: "customers",
          handle: { title: "고객 계정 운영" },
          lazy: guardedLazy("CUSTOMER_READ", async () => {
            const { Adm01CustomerList } = await import("@/pages/admin")
            return Adm01CustomerList
          }),
        },
        {
          // 목록만 막고 상세를 열어 두면 개인정보가 그대로 노출된다.
          path: "customers/:customerId",
          handle: { title: "고객 계정 상세" },
          lazy: guardedLazy("CUSTOMER_READ", async () => {
            const { Adm01CustomerDetail } = await import("@/pages/admin")
            return Adm01CustomerDetail
          }),
        },
        {
          path: "trial-balance",
          handle: { title: "시산표" },
          lazy: guardedLazy("GL_READ", async () => {
            const { Adm02TrialBalance } = await import("@/pages/admin")
            return Adm02TrialBalance
          }),
        },
      ],
    },
  ],
}
