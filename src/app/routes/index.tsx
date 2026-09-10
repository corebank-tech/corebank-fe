import { createBrowserRouter } from "react-router"
import { RootLayout } from "@/app/layouts/root-layout"
import { customerRoutes } from "@/app/routes/customer-routes"

/**
 * 앱의 라우트 트리. 선언형 `<Routes>` 대신 데이터 라우터를 쓰는 이유는
 * 라우트 메타(`handle`)와 라우트 단위 지연 로딩(`lazy`)이 표준으로 붙기 때문이다 —
 * 관리자 채널(#126)이 그 둘을 모두 쓴다.
 */
export const router = createBrowserRouter([
  { element: <RootLayout />, children: customerRoutes },
])
