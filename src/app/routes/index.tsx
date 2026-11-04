import { createBrowserRouter, Navigate, type RouteObject } from "react-router"
import { RootLayout } from "@/app/layouts/root-layout"
import { RouteError } from "@/app/route-error"
import { adminRoutes } from "@/app/routes/admin-routes"
import { customerRoutes } from "@/app/routes/customer-routes"

/**
 * 앱의 라우트 트리. 선언형 `<Routes>` 대신 데이터 라우터를 쓰는 이유는
 * 라우트 메타(`handle`)와 라우트 단위 지연 로딩(`lazy`)이 표준으로 붙기 때문이다 —
 * 관리자 채널(#126)이 그 둘을 모두 쓴다.
 *
 * `errorElement` 는 루트에 둔다. 없는 주소의 404 는 루트 라우트에 걸리므로
 * 하위 라우트의 경계로는 받을 수 없다.
 */
/** 시연 프로토타입(로컬 전용 브랜치). 세션 없이 뜬다. */
const demoRoutes: RouteObject[] = [
  {
    path: "demo/objection/apply",
    lazy: async () => {
      const { ApplyPage } = await import("@/pages/demo-objection")
      return { Component: ApplyPage }
    },
  },
  {
    path: "demo/objection",
    lazy: async () => {
      const { ObjectionListPage } = await import("@/pages/demo-objection")
      return { Component: ObjectionListPage }
    },
  },
  {
    path: "demo/objection/kpi",
    lazy: async () => {
      const { KpiDashboardPage } = await import("@/pages/demo-objection")
      return { Component: KpiDashboardPage }
    },
  },
  {
    path: "demo/objection/:scenarioId/run",
    lazy: async () => {
      const { AnalysisRunPage } = await import("@/pages/demo-objection")
      return { Component: AnalysisRunPage }
    },
  },
  {
    path: "demo/objection/:scenarioId",
    lazy: async () => {
      const { ObjectionDetailPage } = await import("@/pages/demo-objection")
      return { Component: ObjectionDetailPage }
    },
  },
]

/**
 * 시연 전용 정적 배포(VITE_DEMO_ONLY=true)는 RootLayout 을 거치지 않는다.
 * RootLayout 의 SessionProvider 가 고객 프로필 API 를 부르므로, 배포본이 어떤 서버도 부르지 않게 뺀다.
 */
const demoOnlyRouter = () =>
  createBrowserRouter([
    {
      errorElement: <RouteError />,
      children: [
        ...demoRoutes,
        // 시연은 고객 앱 신청부터 시작한다
        { path: "*", element: <Navigate to="/demo/objection/apply" replace /> },
      ],
    },
  ])

export const router =
  import.meta.env.VITE_DEMO_ONLY === "true"
    ? demoOnlyRouter()
    : createBrowserRouter([
        {
          element: <RootLayout />,
          errorElement: <RouteError />,
          children: [...customerRoutes, adminRoutes, ...demoRoutes],
        },
      ])
