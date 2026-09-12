import type { RouteObject } from "react-router"

/** 관리자 채널 경로인지. 도착지를 채널별로 가를 때 쓴다(세션 만료·오류 화면). */
export const isAdminPath = (pathname: string) =>
  pathname === "/admin" || pathname.startsWith("/admin/")

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
      ],
    },
  ],
}
